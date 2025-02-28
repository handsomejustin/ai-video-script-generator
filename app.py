from flask import Flask, render_template, request, jsonify
from pymysql.cursors import DictCursor  # 确保导入DictCursor
import logging
import pymysql
import requests
import json
import re


app = Flask(__name__)

# 数据库配置
db_config = {
    'host': 'localhost',
    'user': 'justin',
    'password': 'Samgod80',
    'database': 'cehua',
    'port': 3306,
    'charset': 'utf8mb4'
}

def remove_think_tags(text):
    """
    移除文本中所有<think>标签及其内容
    示例：
    >>> remove_think_tags('正常文本<think>思考内容</think>')
    '正常文本'
    >>> remove_think_tags('多<think>标</think>签<think>内容</think>')
    '多签'
    """
    return re.sub(r'<think.*?>.*?</think>', '', text, flags=re.DOTALL)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_script():
    try:
        prompt = f"""为毛利哥这个财经IP，策划财经方面的短视频《毛利哥的财经小课堂》，根据给的金点子内容，生成短视频所需要所有脚本。
要求为：
=========
【标题】：要求抓人眼球，看了就想点视频
【精彩前五秒】：前5秒如何抓人眼球？
【脚本】该视频的脚本、导演方式、演员台词。
=========
金点子为：{request.form['idea']}"""

        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': 'deepseek-r1:32b',
                'prompt': prompt,
                'stream': False
            }
        )

        if response.status_code == 200:
            result = json.loads(response.text)
            return jsonify({'raw_response': remove_think_tags(result['response'].strip())})
        else:
            return jsonify({'error': 'AI生成失败'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/extract', methods=['POST'])
def extract_field():
    try:
        field_type = request.json['field_type']
        raw_text = request.json['raw_text']
        
        prompts = {
            'title': "请从以下文本中精确提取【标题】内容，只需返回标题文本不要包含其他内容：\n",
            'opening': "请从以下文本中精确提取【精彩前五秒】内容，只需返回前五秒脚本不要包含其他内容：\n",
            'script': "请从以下文本中精确提取【脚本】正文内容，不要包含导演方式和演员台词：\n",
            'direction': "请从以下文本中精确提取【导演方式】内容，只需返回导演指导说明：\n",
            'dialogue': "请从以下文本中精确提取【演员台词】内容，只需返回对话文本：\n"
        }
        
        response = requests.post(
            'http://localhost:11434/api/generate',
            json={
                'model': 'deepseek-r1:32b',
                'prompt': f"{prompts[field_type]}{raw_text}",
                'stream': False
            }
        )

        if response.status_code == 200:
            result = json.loads(response.text)
            return jsonify({'content': remove_think_tags(result['response'].strip())})
        else:
            return jsonify({'error': '字段提取失败'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save', methods=['POST'])
def save_to_db():
    try:
        conn = pymysql.connect(**db_config)
        cursor = conn.cursor()
        
        sql = """INSERT INTO todo_list 
                (title, opening, script, direction, dialogue)
                VALUES (%s, %s, %s, %s, %s)"""
                
        cursor.execute(sql, (
            request.form['title'],
            request.form['opening'],
            request.form['script'],
            request.form['direction'],
            request.form['dialogue']
        ))
        
        conn.commit()
        return jsonify({'status': 'success'})
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        cursor.close()
        conn.close()

@app.route('/browse')
def browse():
    page = request.args.get('page', 1, type=int)
    per_page = 20

    try:
        conn = pymysql.connect(**db_config)
        with conn.cursor() as cursor:
            # 获取总记录数
            cursor.execute("SELECT COUNT(*) FROM todo_list")
            total = cursor.fetchone()[0]
            
            # 计算分页
            total_pages = (total + per_page - 1) // per_page
            offset = (page - 1) * per_page
            
            # 获取当前页数据
            cursor.execute("SELECT id, title FROM todo_list ORDER BY created_at DESC LIMIT %s OFFSET %s", 
                         (per_page, offset))
            items = cursor.fetchall()
            
        return render_template('browse.html', 
                             items=items,
                             current_page=page,
                             total_pages=total_pages)
        
    except Exception as e:
        return str(e), 500
    finally:
        conn.close()

@app.route('/get_detail/<int:item_id>')
def get_detail(item_id):
    conn = None  # 显式初始化连接变量
    try:
        # 记录调试信息
        app.logger.debug(f"Attempting to connect to database with config: {db_config}")
        
        conn = pymysql.connect(**db_config)
        
        with conn.cursor(DictCursor) as cursor:
            app.logger.debug(f"Executing query for item_id: {item_id}")
            cursor.execute("SELECT * FROM todo_list WHERE id = %s", (item_id,))
            detail = cursor.fetchone()
            
        if not detail:
            app.logger.warning(f"Item {item_id} not found")
            return jsonify({"error": "Item not found"}), 404
            
        app.logger.debug(f"Successfully retrieved item {item_id}")
        return jsonify(detail)
        
    except pymysql.MySQLError as e:
        app.logger.error(f"Database error: {str(e)}")
        return jsonify({"error": "Database operation failed"}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if conn and conn.open:  # 安全关闭连接
            app.logger.debug("Closing database connection")
            conn.close()

if __name__ == '__main__':
    app.run(debug=True)
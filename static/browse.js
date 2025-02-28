document.addEventListener('DOMContentLoaded', () => {
    // 点击列表项加载详情
    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', async function() {
            // 移除所有激活状态
            document.querySelectorAll('.list-item').forEach(i => {
                i.style.background = 'rgba(240, 242, 255, 0.3)';
                i.querySelector('.item-title').style.color = 'var(--primary-color)';
            });
            
            // 设置当前激活状态
            this.style.background = 'var(--accent-color)';
            this.querySelector('.item-title').style.color = 'white';

            // 显示加载状态
            const detailPanel = document.querySelector('.detail-content');
            detailPanel.style.opacity = '0.5';
            
            try {
                const itemId = this.dataset.id;
                const response = await fetch(`/get_detail/${itemId}`);
                const data = await response.json();
                
                // 填充数据
                document.getElementById('detail-title').textContent = data.title;
                document.getElementById('detail-opening').textContent = data.opening;
                document.getElementById('detail-script').textContent = data.script;
                document.getElementById('detail-direction').textContent = data.direction;
                document.getElementById('detail-dialogue').textContent = data.dialogue;
                
            } catch (error) {
                alert('获取详情失败: ' + error.message);
            } finally {
                detailPanel.style.opacity = '1';
            }
        });
    });
    
    // 预加载第一项
    const firstItem = document.querySelector('.list-item');
    if(firstItem) firstItem.click();
});
if (!currentSessionData) return;
let history = JSON.parse(localStorage.getItem('aiTestHistory')) || [];
const prefix = currentSessionData.type === 'speaking' ? '[Nói]' : '[Viết]';
        const title = `${prefix} ${activePromptData.text.substring(0, 30)}...`;
        const dateStr = new Date().toLocaleString('vi-VN');
        
        // 1. Lưu vào LocalStorage (Web)
const newItem = { 
id: Date.now(), 
            date: new Date().toLocaleString('vi-VN'), 
            title: `${prefix} ${activePromptData.text.substring(0, 30)}...`,
            date: dateStr, 
            title: title,
data: currentSessionData 
};
history.push(newItem);
localStorage.setItem('aiTestHistory', JSON.stringify(history));
alert("Đã lưu bài!");
btnSave.classList.add('hidden');
loadHistory();

        // 2. LƯU NGẦM LÊN GOOGLE DRIVE
        // Format nội dung file Text y như lúc tải về
        const fileContent = `BÀI TEST: ${title}\nNGÀY: ${dateStr}\n\nTRANSCRIPT:\n${currentSessionData.transcript || 'N/A'}\n\nĐIỂM SỐ:\nPhát âm/Task: ${currentSessionData.scores.pronunciation || currentSessionData.scores.task_achievement} | Trôi chảy/Coherence: ${currentSessionData.scores.fluency || currentSessionData.scores.coherence} | Từ vựng: ${currentSessionData.scores.vocabulary} | Ngữ pháp: ${currentSessionData.scores.grammar}\n\nĐÁNH GIÁ ĐIỂM MẠNH:\n${(currentSessionData.analysis?.strengths || []).join('\n')}\n\nĐÁNH GIÁ ĐIỂM YẾU:\n${(currentSessionData.analysis?.weaknesses || []).join('\n')}\n\nNHẬN XÉT TỔNG QUAN:\n${currentSessionData.feedback || 'Xem chi tiết trên web.'}`;
        
        // Tạo tên file an toàn (Không chứa ký tự cấm như / hay :)
        const safeDate = dateStr.replace(/[\/:]/g, '-').replace(/ /g, '_');
        const filename = `${prefix}_${safeDate}_${Date.now()}.txt`;

        const drivePayload = {
            action: 'save_to_drive',
            filename: filename,
            content: fileContent
        };

        // Bắn API bằng fetch thông thường (không gọi hàm loading để người dùng không biết)
        fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(drivePayload)
        }).catch(err => console.log("Lưu Drive ngầm thất bại:", err)); // Lỗi thì chỉ báo log, web không sập
});
}

function loadHistory() {
const historyList = document.getElementById('history-list');
let history = JSON.parse(localStorage.getItem('aiTestHistory')) || [];
if (history.length === 0) {
historyList.innerHTML = '<li class="history-item empty-history">Chưa có bài lưu nào.</li>';
return;
}
historyList.innerHTML = '';
history.reverse().forEach(item => {
const li = document.createElement('li');
li.className = 'history-item';
li.innerHTML = `
           <div class="history-title">${item.title}<br><small style="color:#7f8c8d; font-weight:normal;">${item.date}</small></div>
           <i class="fas fa-ellipsis-v history-actions" onclick="toggleMenu(${item.id})"></i>
           <div class="action-menu" id="menu-${item.id}">
               <button onclick="downloadItem(${item.id})"><i class="fas fa-download"></i> Tải về</button>
               <button onclick="shareItem(${item.id})"><i class="fas fa-share"></i> Chia sẻ</button>
               <button onclick="deleteItem(${item.id})" style="color:red;"><i class="fas fa-trash"></i> Xóa</button>
           </div>
       `;
historyList.appendChild(li);
});
}

window.toggleMenu = (id) => {
const menu = document.getElementById(`menu-${id}`);
menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

window.deleteItem = (id) => {
if(confirm("Bạn có chắc muốn xóa bài này?")) {
let history = JSON.parse(localStorage.getItem('aiTestHistory')) || [];
history = history.filter(item => item.id !== id);
localStorage.setItem('aiTestHistory', JSON.stringify(history));
loadHistory();
}
}

window.downloadItem = (id) => {
let history = JSON.parse(localStorage.getItem('aiTestHistory')) || [];
const item = history.find(i => i.id === id);
if (!item) return;
const content = `BÀI TEST: ${item.title}\nNGÀY: ${item.date}\n\nTRANSCRIPT:\n${item.data.transcript || 'N/A'}\n\nĐIỂM SỐ:\nPhát âm/Task: ${item.data.scores.pronunciation || item.data.scores.task_achievement} | Trôi chảy/Coherence: ${item.data.scores.fluency || item.data.scores.coherence} | Từ vựng: ${item.data.scores.vocabulary} | Ngữ pháp: ${item.data.scores.grammar}\n\nNHẬN XÉT:\n${item.data.feedback || 'Xem chi tiết trên web.'}`;
const blob = new Blob([content], { type: 'text/plain' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = `Ket_qua_${item.id}.txt`;
a.click();
}

window.shareItem = (id) => {
let history = JSON.parse(localStorage.getItem('aiTestHistory')) || [];
const item = history.find(i => i.id === id);
if (!item) return;
const shareText = `Tôi vừa hoàn thành bài kiểm tra trên AI EdTech. Điểm Từ vựng: ${item.data.scores.vocabulary}/10, Ngữ pháp: ${item.data.scores.grammar}/10!`;
if (navigator.share) {
navigator.share({ title: 'Kết quả AI Test', text: shareText }).catch(console.error);
} else {
navigator.clipboard.writeText(shareText);
alert("Đã copy vào Clipboard!");
}
}

// Các Mode Tự do & Reset
function setupFreeMode(skill) {
activePromptData = { text: "Hãy thực hiện bài kiểm tra một cách tự do không phụ thuộc vào đề bài cụ thể.", image: null };
if (skill === 'speaking') {
document.getElementById('speaking-question-grid-container').classList.add('hidden');
document.getElementById('active-speaking-prompt-box').classList.remove('hidden');
document.getElementById('speaking-prompt-text').textContent = "🎤 Chế độ Nói Tự Do: Bấm Ghi âm để bắt đầu!";
document.getElementById('speaking-prompt-image').classList.add('hidden');
} else {
document.getElementById('writing-question-grid-container').classList.add('hidden');
document.getElementById('active-writing-prompt-box').classList.remove('hidden');
document.getElementById('writing-prompt-text').textContent = "✍️ Chế độ Viết Tự Do: Gõ bài viết của bạn bên dưới.";
document.getElementById('writing-prompt-image').classList.add('hidden');
btnShowHints.disabled = true; 
btnShowMindmap.disabled = true;
}
startTimer();
}

document.getElementById('btn-free-speaking')?.addEventListener('click', () => setupFreeMode('speaking'));
document.getElementById('btn-free-writing')?.addEventListener('click', () => setupFreeMode('writing'));

function resetWorkspace(skill) {
clearInterval(timerInterval);
countdownDisplay.textContent = "00:00";

if(resultSection) resultSection.classList.add('hidden');
assessmentBox.innerHTML = '<span class="placeholder-text">Đợi một tý, kết quả phân tích chi tiết sẽ có ngay...</span>';
if(btnSave) btnSave.classList.add('hidden');

if (skill === 'speaking') {
audioChunks = [];
audioPlayback.classList.add('hidden');
} else {
writingInput.value = '';
writingInput.dispatchEvent(new Event('input'));
preWritingArea.classList.add('hidden');
}
}

document.getElementById('btn-redo-speaking')?.addEventListener('click', () => { resetWorkspace('speaking'); startTimer(); });
document.getElementById('btn-redo-writing')?.addEventListener('click', () => { resetWorkspace('writing'); startTimer(); });

document.getElementById('btn-new-speaking')?.addEventListener('click', () => {
resetWorkspace('speaking');
document.getElementById('active-speaking-prompt-box').classList.add('hidden');
document.getElementById('speaking-question-grid-container').classList.remove('hidden');
});
document.getElementById('btn-new-writing')?.addEventListener('click', () => {
resetWorkspace('writing');
document.getElementById('active-writing-prompt-box').classList.add('hidden');
document.getElementById('writing-question-grid-container').classList.remove('hidden');
});

// Nút Cào đề ngẫu nhiên
document.getElementById('btn-random-prompt')?.addEventListener('click', async () => {
const btnRandom = document.getElementById('btn-random-prompt');
const originalText = btnRandom.innerHTML;

btnRandom.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm...';
btnRandom.disabled = true;

if (resultSection) resultSection.classList.add('hidden');

const payload = {
action: 'get_random_prompt',
language: langSelect.options[langSelect.selectedIndex].text,
skill: currentSkill,
level: levelSelect.options[levelSelect.selectedIndex].text // Truyền cấp độ lên AI
};

const data = await callBackendAPI(payload, "Đang cào dữ liệu...", false);

btnRandom.innerHTML = originalText;
btnRandom.disabled = false;

if (data) {
activePromptData = { text: data.content, image: null };

if(currentSkill === 'speaking') {
document.getElementById('speaking-question-grid-container').classList.add('hidden');
document.getElementById('active-speaking-prompt-box').classList.remove('hidden');
document.getElementById('speaking-prompt-text').innerHTML = `<strong>${data.title}</strong><br><br>${data.content.replace(/\n/g, '<br>')} <br><br><a href="${data.source_link}" target="_blank" style="font-size:0.85em; color:#3498db;"><i class="fas fa-link"></i> Nguồn tham khảo</a>`;
document.getElementById('speaking-prompt-image').classList.add('hidden');
} else {
document.getElementById('writing-question-grid-container').classList.add('hidden');
document.getElementById('active-writing-prompt-box').classList.remove('hidden');
document.getElementById('writing-prompt-text').innerHTML = `<strong>${data.title}</strong><br><br>${data.content.replace(/\n/g, '<br>')} <br><br><a href="${data.source_link}" target="_blank" style="font-size:0.85em; color:#3498db;"><i class="fas fa-link"></i> Nguồn tham khảo</a>`;
document.getElementById('writing-prompt-image').classList.add('hidden');
preloadHintsLogic();
}
startTimer();
} else {
alert('Lỗi tạo đề ngẫu nhiên. Vui lòng thử lại!');
}
});

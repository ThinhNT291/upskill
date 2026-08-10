// ==========================================
// 1. CẤU HÌNH & DOM
// ==========================================
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxWpuLpICy8Y0cJIQ32JcBuPCjpPdEdDplCOy273XXz-abSr2NijCSVq5r3LpE6iTI2/exec"; 

const skillSelect = document.getElementById('skill-select');
const langSelect = document.getElementById('language-select');
const levelSelect = document.getElementById('level-select');
const btnToggleCustom = document.getElementById('btn-toggle-custom');
const customPromptArea = document.getElementById('custom-prompt-area');
const customPromptText = document.getElementById('custom-prompt-text');
const customPromptImage = document.getElementById('custom-prompt-image');
const btnApplyCustom = document.getElementById('btn-apply-custom');

const speakingWorkspace = document.getElementById('speaking-workspace');
const writingWorkspace = document.getElementById('writing-workspace');
const assessmentBox = document.getElementById('assessment-box');
const btnSave = document.getElementById('btn-save');
const countdownDisplay = document.getElementById('countdown-display');

// Speaking DOM
const speakingQuestionGrid = document.getElementById('speaking-question-grid');
const activeSpeakingPromptBox = document.getElementById('active-speaking-prompt-box');
const speakingPromptText = document.getElementById('speaking-prompt-text');
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const audioPlayback = document.getElementById('audio-playback');
const canvas = document.getElementById('audio-visualizer');
const canvasCtx = canvas.getContext('2d');

// Writing DOM
const writingQuestionGrid = document.getElementById('writing-question-grid');
const activeWritingPromptBox = document.getElementById('active-writing-prompt-box');
const writingPromptText = document.getElementById('writing-prompt-text');
const writingPromptImage = document.getElementById('writing-prompt-image');
const writingInput = document.getElementById('writing-input');
const wordCountDisplay = document.getElementById('word-count');
const btnSubmitWriting = document.getElementById('btn-submit-writing');
const btnClearWriting = document.getElementById('btn-clear-writing');
const btnShowHints = document.getElementById('btn-show-hints');
const btnShowMindmap = document.getElementById('btn-show-mindmap');
const preWritingArea = document.getElementById('pre-writing-area');
const mindmapSvg = document.getElementById('mindmap-svg');
const hintsModal = document.getElementById('hints-modal');
const closeModal = document.getElementById('close-modal');
const hintsModalBody = document.getElementById('hints-modal-body');

// Biến toàn cục
let currentSkill = 'speaking'; 
let customImageBase64 = null; 
let activePromptData = { text: "", image: null }; 
let cachedWritingHints = null;
let isPreloadingHints = false;
let systemQuestions = { speaking: [], writing: [] }; 
let timerInterval;
let timeRemaining = 0;
let mediaRecorder, audioChunks = [], audioCtx, analyser, animationId;

// ==========================================
// 2. KHỞI TẠO & CHUYỂN ĐỔI KỸ NĂNG
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    skillSelect.value = 'speaking';
    loadHistory();
    fetchQuestionsFromGAS(); 
});

skillSelect.addEventListener('change', (e) => {
    currentSkill = e.target.value;
    assessmentBox.innerHTML = '<span class="placeholder-text">Đợi một tý, kết quả phân tích chi tiết sẽ có ngay...</span>';
    if (btnSave) btnSave.classList.add('hidden');
    clearInterval(timerInterval);
    countdownDisplay.textContent = "00:00";
    
    if (currentSkill === 'writing') {
        speakingWorkspace.classList.add('hidden');
        writingWorkspace.classList.remove('hidden');
    } else {
        speakingWorkspace.classList.remove('hidden');
        writingWorkspace.classList.add('hidden');
    }
});

// Nút tắt mở cột 2 bên
document.getElementById('toggle-left')?.addEventListener('click', () => document.getElementById('sidebar-left').classList.toggle('collapsed'));
document.getElementById('toggle-right')?.addEventListener('click', () => document.getElementById('sidebar-right').classList.toggle('collapsed'));

btnToggleCustom.addEventListener('click', () => customPromptArea.classList.toggle('hidden'));

customPromptImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => { customImageBase64 = reader.result; };
        reader.readAsDataURL(file);
    } else customImageBase64 = null;
});

btnApplyCustom.addEventListener('click', () => {
    const text = customPromptText.value.trim();
    if (!text && !customImageBase64) return alert("Vui lòng nhập chữ hoặc up ảnh!");
    
    activePromptData = { text: text, image: customImageBase64 };
    
    if(currentSkill === 'speaking') {
        speakingQuestionGrid.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active'));
        activeSpeakingPromptBox.classList.remove('hidden');
        speakingPromptText.innerHTML = text.replace(/\n/g, '<br>');
    } else {
        writingQuestionGrid.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active')); 
        activeWritingPromptBox.classList.remove('hidden');
        writingPromptText.innerHTML = text.replace(/\n/g, '<br>');
        
        if (customImageBase64) {
            writingPromptImage.src = customImageBase64;
            writingPromptImage.classList.remove('hidden');
        } else {
            writingPromptImage.classList.add('hidden');
        }
        preloadHintsLogic();
    }
    customPromptArea.classList.add('hidden');
    startTimer();
});

// ==========================================
// 3. LOAD GRID ĐỀ BÀI TỪ GAS
// ==========================================
async function fetchQuestionsFromGAS() {
    try {
        const response = await fetch(GAS_WEB_APP_URL + "?action=get_questions", {
            method: "GET",
            redirect: "follow"
        });
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("text/html") !== -1) {
            throw new Error("Google trả về trang HTML. Lỗi Deploy GAS hoặc URL bị sai.");
        }

        const result = await response.json();
        
        speakingQuestionGrid.innerHTML = ''; 
        writingQuestionGrid.innerHTML = '';

        if(result.success) {
            systemQuestions = result.data; 
            
            if (systemQuestions.speaking && systemQuestions.speaking.length > 0) {
                systemQuestions.speaking.forEach((q, index) => {
                    let btn = document.createElement('button');
                    btn.className = 'q-btn';
                    btn.innerHTML = q.title;
                    btn.onclick = () => selectQuestion('speaking', index, btn);
                    speakingQuestionGrid.appendChild(btn);
                });
            } else {
                speakingQuestionGrid.innerHTML = '<span style="color:#7f8c8d;">Chưa có đề Speaking.</span>';
            }

            if (systemQuestions.writing && systemQuestions.writing.length > 0) {
                systemQuestions.writing.forEach((q, index) => {
                    let btn = document.createElement('button');
                    btn.className = 'q-btn';
                    btn.innerHTML = q.title;
                    btn.onclick = () => selectQuestion('writing', index, btn);
                    writingQuestionGrid.appendChild(btn);
                });
            } else {
                writingQuestionGrid.innerHTML = '<span style="color:#7f8c8d;">Chưa có đề Writing.</span>';
            }
        } else {
            throw new Error(result.error);
        }
    } catch(e) {
        console.error("Lỗi chi tiết:", e);
        speakingQuestionGrid.innerHTML = `<span style="color:#e74c3c;">Lỗi: ${e.message}</span>`;
        writingQuestionGrid.innerHTML = `<span style="color:#e74c3c;">Lỗi: ${e.message}</span>`;
    }
}

function selectQuestion(skillType, index, btnElem) {
    const grid = skillType === 'speaking' ? speakingQuestionGrid : writingQuestionGrid;
    grid.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active'));
    btnElem.classList.add('active');

    const q = systemQuestions[skillType][index];
    activePromptData = { text: q.content, image: null };
    
    if (skillType === 'speaking') {
        activeSpeakingPromptBox.classList.remove('hidden');
        speakingPromptText.innerHTML = q.content.replace(/\n/g, '<br>');
    } else {
        activeWritingPromptBox.classList.remove('hidden');
        writingPromptText.innerHTML = q.content.replace(/\n/g, '<br>');
        writingPromptImage.classList.add('hidden');
        preloadHintsLogic();
    }
    startTimer();
}

// ==========================================
// 4. PRELOAD & GỢI Ý (WRITING)
// ==========================================
async function preloadHintsLogic() {
    cachedWritingHints = null;
    isPreloadingHints = true;
    btnShowHints.disabled = false;
    btnShowMindmap.disabled = false;
    btnShowHints.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang nạp Gợi ý ngầm...';
    
    const payload = {
        action: 'get_writing_hints',
        language: langSelect.options[langSelect.selectedIndex].text,
        promptText: activePromptData.text,
        promptImage: activePromptData.image
    };
    
    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) cachedWritingHints = result.data;
    } catch (err) {
        console.error("Preload lỗi:", err);
    } finally {
        isPreloadingHints = false;
        btnShowHints.innerHTML = '<i class="fas fa-lightbulb"></i> Phân tích & Gợi ý (Popup)';
        if (!hintsModal.classList.contains('hidden') && cachedWritingHints) {
            renderHintsToModal(cachedWritingHints);
        }
    }
}

// --- HÀM HỖ TRỢ BIẾN MẢNG THÀNH DANH SÁCH HTML ---
const formatList = (data) => {
    if (Array.isArray(data)) {
        return `<ul class="hint-list">${data.map(item => `<li style="margin-bottom:6px;">${item}</li>`).join('')}</ul>`;
    }
    return `<p>${data.replace(/\n/g, '<br>')}</p>`;
};

function renderHintsToModal(data) {
    hintsModalBody.innerHTML = `
        <div class="hint-section"><h4><i class="fas fa-search"></i> 1. Phân tích đề bài</h4>${formatList(data.analysis)}</div>
        <div class="hint-section"><h4><i class="fas fa-sitemap"></i> 2. Bố cục logic</h4>${formatList(data.organization)}</div>
        <div class="hint-section"><h4><i class="fas fa-chess-knight"></i> 3. Chiến lược đạt điểm cao</h4>${formatList(data.strategy.advice)}
            <div style="margin-top:10px;"><strong>Từ vựng "ăn điểm":</strong><br> ${data.strategy.vocabulary.map(v => `<span class="hint-pill">${v}</span>`).join('')}</div>
            <div style="margin-top:10px;"><strong>Từ nối mạch lạc:</strong><br> ${data.strategy.linking_words.map(l => `<span class="hint-pill">${l}</span>`).join('')}</div>
            <div style="margin-top:10px;"><strong>Mẫu câu hay:</strong><br> ${data.strategy.expressions.map(e => `<span class="hint-pill">${e}</span>`).join('')}</div>
        </div>
        <div class="hint-section" style="background: #fdf2e9; padding: 15px; border-radius: 8px;"><h4><i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i> 4. Lỗi thường gặp</h4>${formatList(data.common_mistakes)}</div>
        <div class="hint-section"><h4><i class="fas fa-stopwatch"></i> 5. Kiểm tra 2 phút cuối</h4>${formatList(data.last_minute_check)}</div>
        <div class="hint-section"><h4><i class="fas fa-brain"></i> 6. Tư duy làm bài</h4>${formatList(data.mindset)}</div>
    `;
}

btnShowHints.addEventListener('click', () => {
    hintsModal.classList.remove('hidden');
    if (isPreloadingHints) {
        hintsModalBody.innerHTML = '<div style="text-align:center; padding: 30px; color:#f39c12;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>AI đang hoàn tất phân tích chiến thuật...</div>';
    } else if (cachedWritingHints) {
        renderHintsToModal(cachedWritingHints);
    } else {
        hintsModalBody.innerHTML = '<span style="color:red;">Không có dữ liệu gợi ý. Hãy chọn đề bài lại.</span>';
    }
});

btnShowMindmap.addEventListener('click', () => {
    preWritingArea.classList.remove('hidden');
    if (isPreloadingHints) {
        mindmapSvg.innerHTML = '<text x="20" y="30" fill="#f39c12">Đang nạp dữ liệu Mindmap...</text>';
    } else if (cachedWritingHints && cachedWritingHints.mindmap_markdown) {
        drawMindmap(cachedWritingHints.mindmap_markdown);
    } else {
        mindmapSvg.innerHTML = '<text x="20" y="30" fill="red">Không có dữ liệu Mindmap.</text>';
    }
});

closeModal.addEventListener('click', () => hintsModal.classList.add('hidden'));
window.addEventListener('click', (e) => { if (e.target === hintsModal) hintsModal.classList.add('hidden'); });

function drawMindmap(markdownText) {
    mindmapSvg.innerHTML = ''; 
    try {
        const { Transformer, Markmap } = window.markmap;
        const transformer = new Transformer();
        const { root } = transformer.transform(markdownText);
        Markmap.create(mindmapSvg, null, root);
    } catch (err) {
        mindmapSvg.innerHTML = `<text x="10" y="20" fill="red">Lỗi render Mindmap: ${err.message}</text>`;
    }
}

// ==========================================
// 5. SOẠN THẢO VÀ NỘP BÀI WRITING
// ==========================================
writingInput.addEventListener('input', () => {
    const text = writingInput.value.trim();
    const words = text.length === 0 ? 0 : text.split(/\s+/).length;
    wordCountDisplay.innerHTML = `<i class="fas fa-pen-nib"></i> Số từ: ${words}`;
    wordCountDisplay.className = words < 120 ? 'word-count-warning' : 'word-count-good';
});

btnClearWriting.addEventListener('click', () => {
    if(confirm("Xóa toàn bộ bài viết hiện tại?")) {
        writingInput.value = '';
        writingInput.dispatchEvent(new Event('input'));
    }
});

btnSubmitWriting.addEventListener('click', async () => {
    const text = writingInput.value.trim();
    if (text.length < 10) return alert("Bài viết quá ngắn!");
    clearInterval(timerInterval); 
    
    assessmentBox.innerHTML = '<span class="placeholder-text" style="color:#f39c12;"><i class="fas fa-spinner fa-spin"></i> Giám khảo AI đang chấm bài Viết...</span>';
    btnSave?.classList.add('hidden');

    const payload = {
        action: 'evaluate_writing',
        text: text,
        language: langSelect.options[langSelect.selectedIndex].text,
        level: levelSelect.options[levelSelect.selectedIndex].text,
        promptText: activePromptData.text,
        promptImage: activePromptData.image
    };

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) renderWritingAssessment(result.data);
        else assessmentBox.innerHTML = `<span style="color:red;">Lỗi: ${result.error}</span>`;
    } catch (err) {
        assessmentBox.innerHTML = `<span style="color:red;">Lỗi kết nối API</span>`;
    }
});

// ==========================================
// 6. MODULE SPEAKING & AUDIO VISUALIZER
// ==========================================
btnRecord.addEventListener('click', async () => {
    if (!activePromptData.text) return alert("Hãy chọn đề bài trước khi ghi âm!");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        startTimer();
        startVisualizer(stream);

        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            currentBlob = new Blob(audioChunks, { type: 'audio/webm' }); 
            audioPlayback.src = URL.createObjectURL(currentBlob);
            audioPlayback.classList.remove('hidden');
            processAudioAndSend(currentBlob);
        };

        mediaRecorder.start();
        btnRecord.disabled = true;
        btnRecord.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang thu...';
        btnStop.disabled = false;
    } catch (err) { alert("Lỗi Micro: " + err.message); }
});

btnStop.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        btnRecord.disabled = false;
        btnRecord.innerHTML = '<i class="fas fa-microphone"></i> Ghi âm lại';
        btnStop.disabled = true;
        clearInterval(timerInterval);
        stopVisualizer();
    }
});

function processAudioAndSend(blob) {
    assessmentBox.innerHTML = '<span class="placeholder-text" style="color:#f39c12;"><i class="fas fa-spinner fa-spin"></i> Giám khảo AI đang phân tích âm thanh...</span>';
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
        const payload = {
            action: 'evaluate_speaking',
            audio: reader.result,
            mimeType: blob.type,
            language: langSelect.options[langSelect.selectedIndex].text,
            level: levelSelect.options[levelSelect.selectedIndex].text,
            promptText: activePromptData.text,
            promptImage: activePromptData.image 
        };
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.success) renderSpeakingAssessment(result.data);
            else assessmentBox.innerHTML = `<span style="color:red;">Lỗi: ${result.error}</span>`;
        } catch (err) {
            assessmentBox.innerHTML = `<span style="color:red;">Lỗi kết nối API</span>`;
        }
    };
}

// ==========================================
// 7. RENDER KẾT QUẢ & LỊCH SỬ
// ==========================================
function startTimer() {
    let minutes = parseInt(document.getElementById('time-limit').value) || 0;
    timeRemaining = minutes * 60;
    updateTimerUI();
    if (timeRemaining > 0) {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerUI();
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                if (currentSkill === 'speaking' && mediaRecorder?.state === "recording") btnStop.click();
                if (currentSkill === 'writing') btnSubmitWriting.click();
            }
        }, 1000);
    }
}

function updateTimerUI() {
    let minutes = parseInt(document.getElementById('time-limit').value) || 0;
    if (minutes === 0) { countdownDisplay.textContent = "∞"; return; }
    let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    let s = (timeRemaining % 60).toString().padStart(2, '0');
    countdownDisplay.textContent = `${m}:${s}`;
}

function startVisualizer(stream) {
    canvas.classList.remove('hidden');
    canvas.width = canvas.parentElement.clientWidth; 
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.fillStyle = '#2c3e50';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            let barHeight = dataArray[i] / 2;
            canvasCtx.fillStyle = `rgb(${barHeight + 100}, 211, 230)`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}

function stopVisualizer() {
    cancelAnimationFrame(animationId);
    if (audioCtx) audioCtx.close();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function renderSpeakingAssessment(data) {
    let html = `
        <div style="background: linear-gradient(135deg, #2ecc71, #27ae60); padding: 15px; border-radius: 8px; color: white; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: white;"><i class="fas fa-award"></i> Trình độ ước tính: <span style="color: #ffeaa7;">${data.estimated_level}</span></h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Phát âm</small><br><strong>${data.scores.pronunciation}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Trôi chảy</small><br><strong>${data.scores.fluency}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Từ vựng</small><br><strong>${data.scores.vocabulary}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Ngữ pháp</small><br><strong>${data.scores.grammar}/10</strong></div>
            </div>
        </div>
        
        <h4><i class="fas fa-quote-left"></i> Bản Transcript:</h4>
        <p style="background: #f8f9fa; padding: 15px; border-radius: 6px; font-style: italic; margin-bottom: 20px;">${data.transcript}</p>
        
        <!-- NEW: PHÂN TÍCH NGỮ ÂM & ÂM SẮC CHUYÊN SÂU -->
        ${data.phonetic_analysis ? `
        <h4 style="color:#8e44ad; border-bottom: 1px solid #ccc; padding-bottom: 5px;"><i class="fas fa-wave-square"></i> Phân tích Ngữ âm & Âm sắc</h4>
        <div style="background: #f4f0fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin-bottom: 10px;"><strong><i class="fas fa-align-left"></i> Ngữ đoạn & Ngữ điệu:</strong> ${data.phonetic_analysis.chunking_intonation}</p>
            <p><strong><i class="fas fa-smile"></i> Âm sắc & Biểu cảm:</strong> ${data.phonetic_analysis.tone_timbre}</p>
        </div>` : ''}

        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px; border-left: 4px solid #27ae60; padding-left: 10px;">
                <h4 style="color:#27ae60; margin-bottom: 5px;"><i class="fas fa-check-circle"></i> Điểm mạnh</h4>
                <ul style="padding-left: 15px; font-size: 0.95em;">${data.analysis.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
            <div style="flex: 1; min-width: 200px; border-left: 4px solid #e74c3c; padding-left: 10px;">
                <h4 style="color:#e74c3c; margin-bottom: 5px;"><i class="fas fa-times-circle"></i> Cần cải thiện</h4>
                <ul style="padding-left: 15px; font-size: 0.95em;">${data.analysis.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
            </div>
        </div>
        
        <h4 style="color:#d35400; border-bottom: 1px solid #ccc; padding-bottom: 5px;"><i class="fas fa-search"></i> Phân tích lỗi</h4>
        <ul style="padding-left: 0; list-style: none; margin-bottom: 20px;">
            ${data.errors.length > 0 ? data.errors.map(err => `<li style="margin-bottom: 10px; background: #fdf2e9; padding: 10px; border-radius: 6px;">
                <del style="color:red; font-weight: bold;">${err.original_phrase}</del> &rarr; <strong style="color:green;">${err.correction}</strong><br>
                <small style="color:#555;">${err.reason}</small>
            </li>`).join('') : '<li style="color:green; padding: 10px;">Tuyệt vời! Không phát hiện lỗi nghiêm trọng.</li>'}
        </ul>
        
        <h4 style="color:#8e44ad;"><i class="fas fa-route"></i> Lộ trình thăng cấp</h4>
        <ul style="padding-left: 20px; font-size: 0.95em; margin-bottom: 20px;">${data.how_to_improve.map(step => `<li>${step}</li>`).join('')}</ul>
        
        <h4 style="color:#2980b9;"><i class="fas fa-magic"></i> Câu trả lời mẫu</h4>
        <p style="background:#eafaf1; padding: 15px; border-left: 4px solid #2980b9; border-radius: 4px; margin-bottom: 20px;">${data.better_version}</p>
        <p style="margin-bottom: 20px;"><strong>Nhận xét chung:</strong> ${data.feedback}</p>

        ${data.reference_links && data.reference_links.length > 0 ? `
        <h4 style="color:#2c3e50;"><i class="fas fa-link"></i> Nguồn tham khảo hữu ích</h4>
        <ul style="padding-left: 20px; margin-bottom: 20px;">
            ${data.reference_links.map(link => `<li><a href="${link.url}" target="_blank" style="color: #2980b9; text-decoration: none; font-weight: bold;">${link.title}</a></li>`).join('')}
        </ul>` : ''}
    `;
    assessmentBox.innerHTML = html;
    currentSessionData = { type: 'speaking', ...data };
    if (btnSave) btnSave.classList.remove('hidden');
}

function renderWritingAssessment(data) {
    let html = `
        <div style="background: linear-gradient(135deg, #8e44ad, #9b59b6); padding: 15px; border-radius: 8px; color: white; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: white;"><i class="fas fa-award"></i> Trình độ ước tính: <span style="color: #ffeaa7;">${data.estimated_level}</span></h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Task Achievement</small><br><strong>${data.scores.task_achievement}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Coherence</small><br><strong>${data.scores.coherence}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Vocabulary</small><br><strong>${data.scores.vocabulary}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Grammar</small><br><strong>${data.scores.grammar}/10</strong></div>
            </div>
        </div>
        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; border-left: 4px solid #27ae60; padding-left: 10px;">
                <h4 style="color:#27ae60; margin-bottom: 5px;"><i class="fas fa-check-circle"></i> Điểm mạnh</h4>
                <ul style="padding-left: 15px; font-size: 0.95em;">${data.analysis.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
            <div style="flex: 1; border-left: 4px solid #e74c3c; padding-left: 10px;">
                <h4 style="color:#e74c3c; margin-bottom: 5px;"><i class="fas fa-times-circle"></i> Cần khắc phục</h4>
                <ul style="padding-left: 15px; font-size: 0.95em;">${data.analysis.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
            </div>
        </div>
        <h4 style="color:#d35400; border-bottom: 1px solid #ccc; padding-bottom: 5px;"><i class="fas fa-search"></i> Lỗi chi tiết (Writing)</h4>
        <ul style="padding-left: 0; list-style: none; margin-bottom: 20px;">
            ${data.errors.length > 0 ? data.errors.map(err => `<li style="margin-bottom: 10px; background: #fdf2e9; padding: 10px; border-radius: 6px;">
                <del style="color:red; font-weight: bold;">${err.original_phrase}</del> &rarr; <strong style="color:green;">${err.correction}</strong><br>
                <small style="color:#555;">${err.reason}</small>
            </li>`).join('') : '<li style="color:green; padding: 10px;">Tuyệt vời! Không phát hiện lỗi sai.</li>'}
        </ul>
        <h4 style="color:#8e44ad;"><i class="fas fa-route"></i> Hướng dẫn thăng hạng</h4>
        <ul style="padding-left: 20px; font-size: 0.95em; margin-bottom: 20px;">${data.how_to_improve.map(step => `<li>${step}</li>`).join('')}</ul>
        <h4 style="color:#2980b9;"><i class="fas fa-copy"></i> Bản nâng cấp (Giữ văn phong)</h4>
        <p style="background:#eafaf1; padding: 15px; border-left: 4px solid #2980b9; border-radius: 4px; margin-bottom: 20px;">${data.better_versions.upgraded}</p>
        <h4 style="color:#f39c12;"><i class="fas fa-crown"></i> Bản Chuyên gia</h4>
        <p style="background:#fdf2e9; padding: 15px; border-left: 4px solid #f39c12; border-radius: 4px; margin-bottom: 20px;">${data.better_versions.expert}</p>
        
        ${data.reference_links && data.reference_links.length > 0 ? `
        <h4 style="color:#2c3e50;"><i class="fas fa-link"></i> Nguồn tham khảo hữu ích</h4>
        <ul style="padding-left: 20px; margin-bottom: 20px;">
            ${data.reference_links.map(link => `<li><a href="${link.url}" target="_blank" style="color: #2980b9; text-decoration: none; font-weight: bold;">${link.title}</a></li>`).join('')}
        </ul>` : ''}
    `;
    assessmentBox.innerHTML = html;
    currentSessionData = { type: 'writing', ...data };
    if (btnSave) btnSave.classList.remove('hidden');
}

if (btnSave) {
    btnSave.addEventListener('click', () => {
        if (!currentSessionData) return;
        let history = JSON.parse(localStorage.getItem('aiTestHistory')) || [];
        const prefix = currentSessionData.type === 'speaking' ? '[Nói]' : '[Viết]';
        const newItem = { 
            id: Date.now(), 
            date: new Date().toLocaleString('vi-VN'), 
            title: `${prefix} ${activePromptData.text.substring(0, 30)}...`,
            data: currentSessionData 
        };
        history.push(newItem);
        localStorage.setItem('aiTestHistory', JSON.stringify(history));
        alert("Đã lưu bài!");
        btnSave.classList.add('hidden');
        loadHistory();
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

// Thiết lập Free Mode
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
// Đóng mọi Popup bằng phím ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
    }
});

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
    const shareText = `Tôi vừa hoàn thành bài kiểm tra ${item.title} trên AI EdTech. Điểm Từ vựng: ${item.data.scores.vocabulary}/10, Ngữ pháp: ${item.data.scores.grammar}/10!`;
    if (navigator.share) {
        navigator.share({ title: 'Kết quả AI Test', text: shareText }).catch(console.error);
    } else {
        navigator.clipboard.writeText(shareText);
        alert("Đã copy vào Clipboard!");
    }
}

// Nút Cào đề ngẫu nhiên
document.getElementById('btn-random-prompt')?.addEventListener('click', async () => {
    currentPrompt.innerHTML = '<span style="color:#27ae60;"><i class="fas fa-spinner fa-spin"></i> Đợi chút nhé...</span>';
    
    const payload = {
        action: 'get_random_prompt',
        language: langSelect.options[langSelect.selectedIndex].text,
        skill: currentSkill
    };
    
    const data = await callBackendAPI(payload, "Processing...", false);
    if (data) {
        activePromptData = { text: data.content, image: null };
        currentPrompt.innerHTML = `<strong>Đề tự động:</strong> ${data.title} <a href="${data.source_link}" target="_blank" style="font-size:0.8em; color:#3498db;">[Nguồn]</a>`;
        
        if(currentSkill === 'speaking') {
            document.getElementById('active-speaking-prompt-box').classList.remove('hidden');
            document.getElementById('speaking-prompt-text').innerHTML = data.content.replace(/\n/g, '<br>');
        } else {
            document.getElementById('active-writing-prompt-box').classList.remove('hidden');
            document.getElementById('writing-prompt-text').innerHTML = data.content.replace(/\n/g, '<br>');
            preloadHintsLogic();
        }
        startTimer();
    } else {
        currentPrompt.innerHTML = '<span style="color:red;">Có lỗi rồi. Vui lòng thử lại.</span>';
    }
});

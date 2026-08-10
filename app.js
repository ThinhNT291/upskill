// ==========================================
// 1. CẤU HÌNH & DOM
// ==========================================
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxWpuLpICy8Y0cJIQ32JcBuPCjpPdEdDplCOy273XXz-abSr2NijCSVq5r3LpE6iTI2/exec"; 

marked.setOptions({ breaks: true }); 

const skillSelect = document.getElementById('skill-select');
const langSelect = document.getElementById('language-select');
const levelSelect = document.getElementById('level-select');
const btnToggleCustom = document.getElementById('btn-toggle-custom');
const customPromptArea = document.getElementById('custom-prompt-area');
const customPromptText = document.getElementById('custom-prompt-text');
const customPromptImage = document.getElementById('custom-prompt-image');
const imageFileName = document.getElementById('image-file-name');
const btnApplyCustom = document.getElementById('btn-apply-custom');

const speakingWorkspace = document.getElementById('speaking-workspace');
const writingWorkspace = document.getElementById('writing-workspace');
const assessmentBox = document.getElementById('assessment-box');
const resultSection = document.getElementById('result-section');
const btnSave = document.getElementById('btn-save');

const countdownDisplay = document.getElementById('countdown-display');
const prepTimerBanner = document.getElementById('prep-timer-banner');
const prepTimeDisplay = document.getElementById('prep-time-display');

const speakingQuestionGrid = document.getElementById('speaking-question-grid');
const activeSpeakingPromptBox = document.getElementById('active-speaking-prompt-box');
const speakingPromptText = document.getElementById('speaking-prompt-text');
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const audioPlayback = document.getElementById('audio-playback');
const canvas = document.getElementById('audio-visualizer');
const canvasCtx = canvas.getContext('2d');
const speakingMindmapArea = document.getElementById('speaking-mindmap-area');
const speakingMindmapSvg = document.getElementById('speaking-mindmap-svg');

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

let currentSkill = 'speaking'; 
let customImageBase64 = null; 
let activePromptData = { text: "", image: null }; 
let cachedWritingHints = null;
let isPreloadingHints = false;
let systemQuestions = { speaking: [], writing: [] }; 
let currentSelectedGroup = null; 
let cachedWritingHintsError = null;

let mediaRecorder, audioChunks = [], audioCtx, analyser, animationId;
let currentAudioBase64 = null;

let prepInterval, mainInterval;
let prepTimeRemaining = 60;
let mainTimeRemaining = 0;
let isMainRunning = false;

// ==========================================
// 2. KHỞI TẠO & CHUYỂN ĐỔI KỸ NĂNG
// ==========================================
const LANGUAGE_LEVELS = {
    english: [
        { value: "A1-A2 (Beginner)", text: "A1-A2 (Sơ cấp / IELTS 3.0-4.0)" },
        { value: "B1 (Intermediate)", text: "B1 (Trung cấp / IELTS 4.5-5.0)" },
        { value: "B2 (Upper-Intermediate)", text: "B2 (Trung cao / IELTS 5.5-6.5)", selected: true },
        { value: "C1 (Advanced)", text: "C1 (Cao cấp / IELTS 7.0-8.0)" },
        { value: "C2 (Proficient)", text: "C2 (Thành thạo / IELTS 8.5+)" }
    ],
    chinese: [
        { value: "HSK 1-2 (Sơ cấp)", text: "HSK 1 - HSK 2 (Sơ cấp)" },
        { value: "HSK 3-4 (Trung cấp)", text: "HSK 3 - HSK 4 (Trung cấp)", selected: true },
        { value: "HSK 5 (Cao cấp)", text: "HSK 5 (Cao cấp)" },
        { value: "HSK 6 (Thành thạo)", text: "HSK 6 (Thành thạo)" }
    ],
    russian: [
        { value: "TORFL A1-A2 (Elementary)", text: "Элементарный (A1-A2 / Sơ cấp)" },
        { value: "TORFL B1 (TRKI-1)", text: "ТРКИ-1 (B1 / Trung cấp)", selected: true },
        { value: "TORFL B2 (TRKI-2)", text: "ТРКИ-2 (B2 / Trung cao)" },
        { value: "TORFL C1-C2 (TRKI-3/4)", text: "ТРКИ-3/4 (C1-C2 / Cao cấp)" }
    ]
};

function updateLevelOptions(lang) {
    levelSelect.innerHTML = '';
    const levels = LANGUAGE_LEVELS[lang] || LANGUAGE_LEVELS.english;
    levels.forEach(lvl => {
        let opt = document.createElement('option');
        opt.value = lvl.value;
        opt.textContent = lvl.text;
        if (lvl.selected) opt.selected = true;
        levelSelect.appendChild(opt);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    skillSelect.value = 'speaking';
    loadHistory();
    fetchQuestionsFromGAS(); 
    langSelect.addEventListener('change', (e) => updateLevelOptions(e.target.value));
    updateLevelOptions(langSelect.value);
});

skillSelect.addEventListener('change', (e) => {
    currentSkill = e.target.value;
    resetWorkspace(currentSkill);
    if (currentSkill === 'writing') {
        speakingWorkspace.classList.add('hidden');
        writingWorkspace.classList.remove('hidden');
    } else {
        speakingWorkspace.classList.remove('hidden');
        writingWorkspace.classList.add('hidden');
    }
});

document.getElementById('toggle-left')?.addEventListener('click', () => document.getElementById('sidebar-left').classList.toggle('collapsed'));
document.getElementById('toggle-right')?.addEventListener('click', () => document.getElementById('sidebar-right').classList.toggle('collapsed'));
btnToggleCustom.addEventListener('click', () => customPromptArea.classList.toggle('hidden'));

customPromptImage.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if(imageFileName) { imageFileName.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang đọc ảnh...`; imageFileName.style.color = "#f39c12"; }
        const reader = new FileReader();
        reader.onloadend = () => { 
            customImageBase64 = reader.result; 
            if(imageFileName) { imageFileName.innerHTML = `<i class="fas fa-check-circle"></i> Đã tải xong`; imageFileName.style.color = "#27ae60"; }
        };
        reader.readAsDataURL(file);
    } else {
        if(imageFileName) { imageFileName.innerHTML = "Chưa có ảnh nào"; imageFileName.style.color = "#27ae60"; }
        customImageBase64 = null;
    }
});

btnApplyCustom.addEventListener('click', async () => {
    const text = customPromptText.value.trim();
    if (!text && !customImageBase64) return alert("Vui lòng nhập chữ hoặc up ảnh!");
    
    const originalBtnHtml = btnApplyCustom.innerHTML;
    let finalPromptText = text;

    if (customImageBase64) {
        btnApplyCustom.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang phân tích...';
        btnApplyCustom.disabled = true;
        const payload = { action: 'analyze_image_prompt', image: customImageBase64 };
        try {
            const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            if (result.success && result.data && result.data.extracted_prompt) {
                finalPromptText = text ? `${text}\n\n[AI Phân tích]:\n${result.data.extracted_prompt}` : `[AI Phân tích]:\n${result.data.extracted_prompt}`;
            }
        } catch (err) { console.error("Lỗi:", err); }
    }

    activePromptData = { text: finalPromptText, image: customImageBase64 };
    btnApplyCustom.innerHTML = originalBtnHtml;
    btnApplyCustom.disabled = false;
    customPromptArea.classList.add('hidden');
    
    document.getElementById('speaking-tabs').innerHTML = '';
    document.getElementById('writing-tabs').innerHTML = '';
    speakingMindmapArea.classList.add('hidden');
    preWritingArea?.classList.add('hidden');

    if(currentSkill === 'speaking') {
        speakingQuestionGrid.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active'));
        activeSpeakingPromptBox.classList.remove('hidden');
        speakingPromptText.innerHTML = marked.parse(finalPromptText);
        const spkImage = document.getElementById('speaking-prompt-image');
        if (customImageBase64) { spkImage.src = customImageBase64; spkImage.classList.remove('hidden'); } 
        else spkImage.classList.add('hidden');
    } else {
        writingQuestionGrid.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active')); 
        activeWritingPromptBox.classList.remove('hidden');
        writingPromptText.innerHTML = marked.parse(finalPromptText);
        if (customImageBase64) { writingPromptImage.src = customImageBase64; writingPromptImage.classList.remove('hidden'); } 
        else writingPromptImage.classList.add('hidden');
        preloadHintsLogic();
    }
    startPrepTimer(); 
});

async function callBackendAPI(payload, loadingMessage, isMainAssessment = true) {
    if (isMainAssessment) {
        if (resultSection) resultSection.classList.remove('hidden');
        assessmentBox.innerHTML = `<span class="placeholder-text" style="color:#f39c12;"><i class="fas fa-spinner fa-spin"></i> ${loadingMessage}</span>`;
        if (btnSave) btnSave.classList.add('hidden');
    }
    try {
        const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return result.data;
    } catch (err) {
        if (isMainAssessment) assessmentBox.innerHTML = `<span style="color:red;"><i class="fas fa-exclamation-triangle"></i> Lỗi kết nối: ${err.message}</span>`;
        return null;
    }
}

// ==========================================
// 3. LOAD GRID ĐỀ BÀI VÀ QUẢN LÝ TAB
// ==========================================
async function fetchQuestionsFromGAS() {
    try {
        const response = await fetch(GAS_WEB_APP_URL + "?action=get_questions", { method: "GET", redirect: "follow" });
        const result = await response.json();
        if(result.success) {
            systemQuestions.speaking = groupQuestionsByTitle(result.data.speaking);
            systemQuestions.writing = groupQuestionsByTitle(result.data.writing);
            renderGrid(speakingQuestionGrid, systemQuestions.speaking, 'speaking');
            renderGrid(writingQuestionGrid, systemQuestions.writing, 'writing');
        } else throw new Error(result.error);
    } catch(e) {
        speakingQuestionGrid.innerHTML = `<span style="color:#e74c3c;">Lỗi: ${e.message}</span>`;
        writingQuestionGrid.innerHTML = `<span style="color:#e74c3c;">Lỗi: ${e.message}</span>`;
    }
}

function groupQuestionsByTitle(flatArray) {
    const groupedObj = {};
    flatArray.forEach(item => {
        if (!groupedObj[item.title]) groupedObj[item.title] = { title: item.title, parts: [] };
        groupedObj[item.title].parts.push({ partName: item.part, content: item.content });
    });
    return Object.values(groupedObj);
}

function renderGrid(container, groupedArray, skillType) {
    container.innerHTML = '';
    if (!groupedArray || groupedArray.length === 0) return container.innerHTML = '<span style="color:#7f8c8d;">Chưa có dữ liệu.</span>';
    groupedArray.forEach((q, idx) => {
        let btn = document.createElement('button');
        btn.className = 'q-btn';
        btn.innerHTML = q.title;
        btn.onclick = () => selectQuestion(skillType, idx, btn);
        container.appendChild(btn);
    });
}

function selectQuestion(skillType, index, btnElem) {
    resetWorkspace(skillType); 
    const gridContainer = skillType === 'speaking' ? speakingQuestionGrid : writingQuestionGrid;
    gridContainer.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active'));
    btnElem.classList.add('active');

    currentSelectedGroup = systemQuestions[skillType][index];
    activePromptData = { text: currentSelectedGroup.parts.map(p => `[${p.partName}]\n${p.content}`).join('\n\n'), image: null };

    const tabsContainerId = skillType === 'speaking' ? 'speaking-tabs' : 'writing-tabs';
    document.getElementById(tabsContainerId).innerHTML = currentSelectedGroup.parts.map((p, pIndex) => 
        `<button class="tab-btn ${pIndex === 0 ? 'active' : ''}" onclick="switchTab('${skillType}', ${pIndex})">${p.partName}</button>`
    ).join('');

    if (skillType === 'speaking') {
        activeSpeakingPromptBox.classList.remove('hidden');
    } else {
        activeWritingPromptBox.classList.remove('hidden');
        writingPromptImage.classList.add('hidden');
        preloadHintsLogic(); 
    }
    
    switchTab(skillType, 0);
    startPrepTimer(); 
}

window.switchTab = (skillType, partIndex) => {
    const tabsContainerId = skillType === 'speaking' ? 'speaking-tabs' : 'writing-tabs';
    document.getElementById(tabsContainerId).querySelectorAll('.tab-btn').forEach((t, i) => {
        if(i === partIndex) t.classList.add('active'); else t.classList.remove('active');
    });

    const partData = currentSelectedGroup.parts[partIndex];
    let displayText = partData.content;
    let hasMindmap = false;

    if (displayText.includes('# ')) {
        hasMindmap = true;
        displayText = displayText.substring(0, displayText.indexOf('# ')).trim();
    }

    if (skillType === 'speaking') {
        speakingPromptText.innerHTML = marked.parse(displayText);
        if (hasMindmap) {
            speakingMindmapArea.classList.remove('hidden');
            let markdownContent = partData.content.substring(partData.content.indexOf('# '));
            drawMindmapToSVG(markdownContent, speakingMindmapSvg);
        } else speakingMindmapArea.classList.add('hidden');
    } else {
        writingPromptText.innerHTML = marked.parse(displayText);
    }
}

function drawMindmapToSVG(markdownText, svgElement) {
    svgElement.innerHTML = ''; 
    try {
        const { Transformer, Markmap } = window.markmap;
        const transformer = new Transformer();
        const { root } = transformer.transform(markdownText);
        Markmap.create(svgElement, { autoFit: true, spacingHorizontal: 120, spacingVertical: 40 }, root);
    } catch (err) {
        svgElement.innerHTML = `<text x="10" y="20" fill="red">Lỗi vẽ Sơ đồ: ${err.message}</text>`;
    }
}

// ==========================================
// 4. QUẢN LÝ ĐỒNG HỒ 
// ==========================================
function startPrepTimer() {
    clearInterval(prepInterval);
    clearInterval(mainInterval);
    isMainRunning = false;
    prepTimeRemaining = 60;
    
    prepTimerBanner.classList.remove('hidden');
    prepTimeDisplay.textContent = prepTimeRemaining;
    updateMainTimerUI(true); 
    
    prepInterval = setInterval(() => {
        prepTimeRemaining--;
        prepTimeDisplay.textContent = prepTimeRemaining;
        if (prepTimeRemaining <= 0) {
            clearInterval(prepInterval);
            prepTimerBanner.classList.add('hidden');
            startMainTimer(); 
        }
    }, 1000);
}

function startMainTimer() {
    if (isMainRunning) return; 
    clearInterval(prepInterval);
    prepTimerBanner.classList.add('hidden');
    isMainRunning = true;
    
    let minutes = parseInt(document.getElementById('time-limit').value) || 0;
    mainTimeRemaining = minutes * 60;
    updateMainTimerUI();
    
    if (mainTimeRemaining > 0) {
        mainInterval = setInterval(() => {
            mainTimeRemaining--;
            updateMainTimerUI();
            if (mainTimeRemaining <= 0) {
                clearInterval(mainInterval);
                if (currentSkill === 'speaking' && mediaRecorder?.state === "recording") btnStop.click();
                if (currentSkill === 'writing') btnSubmitWriting.click();
            }
        }, 1000);
    }
}

function updateMainTimerUI(reset = false) {
    let minutes = parseInt(document.getElementById('time-limit').value) || 0;
    if (minutes === 0) { countdownDisplay.textContent = "∞"; return; }
    let timeToDisplay = reset ? (minutes * 60) : mainTimeRemaining;
    let m = Math.floor(timeToDisplay / 60).toString().padStart(2, '0');
    let s = (timeToDisplay % 60).toString().padStart(2, '0');
    countdownDisplay.textContent = `${m}:${s}`;
}

// ==========================================
// 5. GỢI Ý & SOẠN THẢO (WRITING) - ĐÃ BỔ SUNG ĐẦY ĐỦ
// ==========================================
async function preloadHintsLogic() {
    cachedWritingHints = null;
    cachedWritingHintsError = null;
    isPreloadingHints = true;
    btnShowHints.disabled = false;
    btnShowMindmap.disabled = false;
    btnShowHints.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang nạp Gợi ý ngầm...';
    
    const payload = { action: 'get_writing_hints', language: langSelect.options[langSelect.selectedIndex].text, level: levelSelect.options[levelSelect.selectedIndex].text, promptText: activePromptData.text, promptImage: activePromptData.image };
    
    try {
        const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.success) cachedWritingHints = result.data; else cachedWritingHintsError = result.error; 
    } catch (err) { cachedWritingHintsError = "Mất kết nối API: " + err.message; } 
    finally {
        isPreloadingHints = false;
        btnShowHints.innerHTML = '<i class="fas fa-lightbulb"></i> Phân tích & Gợi ý (Popup)';
        if (!hintsModal.classList.contains('hidden') && cachedWritingHints) renderHintsToModal(cachedWritingHints);
    }
}

const formatList = (data) => Array.isArray(data) ? `<ul class="hint-list">${data.map(item => `<li style="margin-bottom:6px;">${item}</li>`).join('')}</ul>` : `<p>${(data || "").replace(/\n/g, '<br>')}</p>`;

function renderHintsToModal(data) {
    hintsModalBody.innerHTML = `
        <div class="hint-section"><h4><i class="fas fa-search"></i> 1. Phân tích đề bài</h4>${formatList(data.analysis)}</div>
        <div class="hint-section"><h4><i class="fas fa-sitemap"></i> 2. Bố cục logic</h4>${formatList(data.organization)}</div>
        <div class="hint-section"><h4><i class="fas fa-chess-knight"></i> 3. Chiến lược đạt điểm cao</h4>${formatList(data.strategy?.advice)}
            <div style="margin-top:10px;"><strong>Từ vựng:</strong><br> ${(data.strategy?.vocabulary || []).map(v => `<span class="hint-pill">${v}</span>`).join('')}</div>
        </div>
        <div class="hint-section" style="background: #fdf2e9; padding: 15px; border-radius: 8px;"><h4><i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i> 4. Lỗi thường gặp</h4>${formatList(data.common_mistakes)}</div>
        <div class="hint-section"><h4><i class="fas fa-stopwatch"></i> 5. Kiểm tra 2 phút cuối</h4>${formatList(data.last_minute_check)}</div>
    `;
}

btnShowHints.addEventListener('click', () => {
    hintsModal.classList.remove('hidden');
    if (isPreloadingHints) hintsModalBody.innerHTML = '<div style="text-align:center; padding: 30px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    else if (cachedWritingHints) renderHintsToModal(cachedWritingHints);
    else hintsModalBody.innerHTML = `<span style="color:red; font-weight:bold;">Lỗi gợi ý: ${cachedWritingHintsError || "Hệ thống AI không phản hồi."}</span>`;
});

btnShowMindmap.addEventListener('click', () => {
    preWritingArea.classList.remove('hidden');
    if (isPreloadingHints) mindmapSvg.innerHTML = '<text x="20" y="30" fill="#f39c12">Đang nạp dữ liệu Mindmap...</text>';
    else if (cachedWritingHints && cachedWritingHints.mindmap_markdown) drawMindmapToSVG(cachedWritingHints.mindmap_markdown, mindmapSvg);
    else mindmapSvg.innerHTML = '<text x="20" y="30" fill="red">Chưa có dữ liệu Sơ đồ.</text>';
});

closeModal.addEventListener('click', () => hintsModal.classList.add('hidden'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden')); });

// BỘ ĐẾM TỪ & NỘP BÀI (ĐÃ KHÔI PHỤC)
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
    clearInterval(mainInterval); 
    
    const payload = {
        action: 'evaluate_writing', text: text,
        language: langSelect.options[langSelect.selectedIndex].text,
        level: levelSelect.options[levelSelect.selectedIndex].text,
        promptText: activePromptData.text, promptImage: activePromptData.image
    };

    const data = await callBackendAPI(payload, "Giám khảo AI đang chấm bài Viết...");
    if (data) renderWritingAssessment(data);
});

// ==========================================
// 6. MODULE SPEAKING 
// ==========================================
btnRecord.addEventListener('click', async () => {
    if (!activePromptData.text) return alert("Hãy chọn đề bài trước khi ghi âm!");
    startMainTimer();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
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
        clearInterval(mainInterval);
        stopVisualizer();
    }
});

function processAudioAndSend(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
        currentAudioBase64 = reader.result;
        const payload = { action: 'evaluate_speaking', audio: reader.result, mimeType: blob.type, language: langSelect.options[langSelect.selectedIndex].text, level: levelSelect.options[levelSelect.selectedIndex].text, promptText: activePromptData.text, promptImage: activePromptData.image };
        const data = await callBackendAPI(payload, "Giám khảo AI đang phân tích âm thanh của bạn...");
        if (data) renderSpeakingAssessment(data);
    };
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

// ==========================================
// 7. RENDER KẾT QUẢ, LỊCH SỬ & RESET
// ==========================================
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
        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px; border-left: 4px solid #27ae60; padding-left: 10px;">
                <h4 style="color:#27ae60; margin-bottom: 5px;"><i class="fas fa-check-circle"></i> Điểm mạnh</h4>${formatList(data.analysis.strengths)}
            </div>
            <div style="flex: 1; min-width: 200px; border-left: 4px solid #e74c3c; padding-left: 10px;">
                <h4 style="color:#e74c3c; margin-bottom: 5px;"><i class="fas fa-times-circle"></i> Cần cải thiện</h4>${formatList(data.analysis.weaknesses)}
            </div>
        </div>
        <h4 style="color:#2980b9;"><i class="fas fa-magic"></i> Câu trả lời mẫu</h4>
        <p style="background:#eafaf1; padding: 15px; border-left: 4px solid #2980b9; border-radius: 4px; margin-bottom: 20px;">${data.better_version}</p>
        <p style="margin-bottom: 20px;"><strong>Nhận xét chung:</strong> ${data.feedback}</p>
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
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Task</small><br><strong>${data.scores.task_achievement}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Coherence</small><br><strong>${data.scores.coherence}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Vocabulary</small><br><strong>${data.scores.vocabulary}/10</strong></div>
                <div style="flex:1; background:rgba(255,255,255,0.2); padding: 10px; border-radius:8px; text-align:center;"><small>Grammar</small><br><strong>${data.scores.grammar}/10</strong></div>
            </div>
        </div>
        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; border-left: 4px solid #27ae60; padding-left: 10px;">
                <h4 style="color:#27ae60; margin-bottom: 5px;"><i class="fas fa-check-circle"></i> Điểm mạnh</h4>${formatList(data.analysis.strengths)}
            </div>
            <div style="flex: 1; border-left: 4px solid #e74c3c; padding-left: 10px;">
                <h4 style="color:#e74c3c; margin-bottom: 5px;"><i class="fas fa-times-circle"></i> Cần khắc phục</h4>${formatList(data.analysis.weaknesses)}
            </div>
        </div>
        <h4 style="color:#8e44ad;"><i class="fas fa-route"></i> Hướng dẫn thăng hạng</h4>${formatList(data.how_to_improve)}
        <h4 style="color:#2980b9;"><i class="fas fa-copy"></i> Bản nâng cấp (Giữ văn phong)</h4>
        <p style="background:#eafaf1; padding: 15px; border-left: 4px solid #2980b9; border-radius: 4px; margin-bottom: 20px;">${data.better_versions?.upgraded || "Không có dữ liệu"}</p>
        <h4 style="color:#f39c12;"><i class="fas fa-crown"></i> Bản Chuyên gia</h4>
        <p style="background:#fdf2e9; padding: 15px; border-left: 4px solid #f39c12; border-radius: 4px; margin-bottom: 20px;">${data.better_versions?.expert || "Không có dữ liệu"}</p>
    `;
    assessmentBox.innerHTML = html;
    currentSessionData = { type: 'writing', ...data };
    if (btnSave) btnSave.classList.remove('hidden');
}

// LƯU LỊCH SỬ VÀ DRIVE
if (btnSave) {
    btnSave.addEventListener('click', () => {
        if (!currentSessionData) return;
        let history = JSON.parse(localStorage.getItem('aiTestHistory')) || [];
        const prefix = currentSessionData.type === 'speaking' ? '[Nói]' : '[Viết]';
        const title = `${prefix} ${activePromptData.text.substring(0, 30)}...`;
        const dateStr = new Date().toLocaleString('vi-VN');
        
        history.push({ id: Date.now(), date: dateStr, title: title, data: currentSessionData });
        localStorage.setItem('aiTestHistory', JSON.stringify(history));
        alert("Đã lưu bài!");
        btnSave.classList.add('hidden');
        loadHistory();

        // LƯU NGẦM LÊN DRIVE
        const fileContent = `BÀI TEST: ${title}\nNGÀY: ${dateStr}\n\nTRANSCRIPT:\n${currentSessionData.transcript || 'N/A'}\n\nĐIỂM SỐ:\nPhát âm/Task: ${currentSessionData.scores.pronunciation || currentSessionData.scores.task_achievement} | Trôi chảy/Coherence: ${currentSessionData.scores.fluency || currentSessionData.scores.coherence} | Từ vựng: ${currentSessionData.scores.vocabulary} | Ngữ pháp: ${currentSessionData.scores.grammar}\n\nĐÁNH GIÁ ĐIỂM MẠNH:\n${(currentSessionData.analysis?.strengths || []).join('\n')}\n\nĐÁNH GIÁ ĐIỂM YẾU:\n${(currentSessionData.analysis?.weaknesses || []).join('\n')}\n\nNHẬN XÉT TỔNG QUAN:\n${currentSessionData.feedback || 'Xem chi tiết trên web.'}`;
        const safeDate = dateStr.replace(/[\/:]/g, '-').replace(/ /g, '_');
        const filename = `${prefix}_${safeDate}_${Date.now()}.txt`;
        const drivePayload = { action: 'save_to_drive', filename: filename, content: fileContent };

        fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(drivePayload) }).catch(err => console.log("Lưu Drive ngầm thất bại:", err)); 

        if (currentSessionData.type === 'speaking' && currentAudioBase64) {
            const audioFilename = `[Audio]_${safeDate}_${Date.now()}.webm`;
            const driveAudioPayload = { action: 'save_to_drive', filename: audioFilename, content: currentAudioBase64, isAudio: true };
            fetch(GAS_WEB_APP_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(driveAudioPayload) }).catch(err => console.log("Lưu Audio ngầm thất bại:", err));
        }
    });
}

function loadHistory() {
    const historyList = document.getElementById('history-list');
    let history = JSON.parse(localStorage.getItem('aiTestHistory')) || [];
    if (history.length === 0) return historyList.innerHTML = '<li class="history-item empty-history">Chưa có bài lưu nào.</li>';
    historyList.innerHTML = '';
    history.reverse().forEach(item => {
        historyList.innerHTML += `
            <li class="history-item">
                <div class="history-title">${item.title}<br><small style="color:#7f8c8d; font-weight:normal;">${item.date}</small></div>
                <i class="fas fa-ellipsis-v history-actions" onclick="document.getElementById('menu-${item.id}').style.display = document.getElementById('menu-${item.id}').style.display === 'block' ? 'none' : 'block'"></i>
                <div class="action-menu" id="menu-${item.id}">
                    <button onclick="deleteItem(${item.id})" style="color:red;"><i class="fas fa-trash"></i> Xóa</button>
                </div>
            </li>
        `;
    });
}
window.deleteItem = (id) => { if(confirm("Xóa bài này?")) { localStorage.setItem('aiTestHistory', JSON.stringify((JSON.parse(localStorage.getItem('aiTestHistory')) || []).filter(item => item.id !== id))); loadHistory(); } }

function resetWorkspace(skill) {
    clearInterval(prepInterval);
    clearInterval(mainInterval);
    isMainRunning = false;
    prepTimerBanner.classList.add('hidden');
    countdownDisplay.textContent = "00:00";
    
    if(resultSection) resultSection.classList.add('hidden');
    assessmentBox.innerHTML = '<span class="placeholder-text">Đợi một tý, kết quả phân tích chi tiết sẽ có ngay...</span>';
    if(btnSave) btnSave.classList.add('hidden');

    if (skill === 'speaking') {
        audioChunks = []; currentAudioBase64 = null; audioPlayback.classList.add('hidden');
        speakingMindmapArea.classList.add('hidden'); 
    } else {
        writingInput.value = ''; writingInput.dispatchEvent(new Event('input'));
        preWritingArea?.classList.add('hidden'); 
    }
}

document.getElementById('btn-redo-speaking')?.addEventListener('click', () => { resetWorkspace('speaking'); startPrepTimer(); });
document.getElementById('btn-redo-writing')?.addEventListener('click', () => { resetWorkspace('writing'); startPrepTimer(); });
document.getElementById('btn-new-speaking')?.addEventListener('click', () => { resetWorkspace('speaking'); document.getElementById('active-speaking-prompt-box').classList.add('hidden'); document.getElementById('speaking-question-grid-container').classList.remove('hidden'); });
document.getElementById('btn-new-writing')?.addEventListener('click', () => { resetWorkspace('writing'); document.getElementById('active-writing-prompt-box').classList.add('hidden'); document.getElementById('writing-question-grid-container').classList.remove('hidden'); });

function setupFreeMode(skill) {
    resetWorkspace(skill);
    activePromptData = { text: "Hãy thực hiện bài kiểm tra tự do không phụ thuộc vào đề bài cụ thể.", image: null };
    if (skill === 'speaking') {
        document.getElementById('speaking-question-grid-container').classList.add('hidden');
        document.getElementById('active-speaking-prompt-box').classList.remove('hidden');
        document.getElementById('speaking-tabs').innerHTML = ''; 
        speakingPromptText.innerHTML = marked.parse("🎤 **Chế độ Nói Tự Do:** Bấm Ghi âm để bắt đầu tính giờ làm bài!");
        document.getElementById('speaking-prompt-image').classList.add('hidden');
    } else {
        document.getElementById('writing-question-grid-container').classList.add('hidden');
        document.getElementById('active-writing-prompt-box').classList.remove('hidden');
        document.getElementById('writing-tabs').innerHTML = ''; 
        writingPromptText.innerHTML = marked.parse("✍️ **Chế độ Viết Tự Do:** Gõ bài viết của bạn bên dưới, hệ thống sẽ tự bắt đầu tính giờ.");
        document.getElementById('writing-prompt-image').classList.add('hidden');
        btnShowHints.disabled = true; 
    }
    startPrepTimer();
}
document.getElementById('btn-free-speaking')?.addEventListener('click', () => setupFreeMode('speaking'));
document.getElementById('btn-free-writing')?.addEventListener('click', () => setupFreeMode('writing'));

document.getElementById('btn-random-prompt')?.addEventListener('click', async () => {
    const btnRandom = document.getElementById('btn-random-prompt');
    const originalText = btnRandom.innerHTML;
    
    btnRandom.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm...';
    btnRandom.disabled = true;
    resetWorkspace(currentSkill);
    
    const payload = { action: 'get_random_prompt', language: langSelect.options[langSelect.selectedIndex].text, skill: currentSkill, level: levelSelect.options[levelSelect.selectedIndex].text };
    const data = await callBackendAPI(payload, "Đang cào dữ liệu...", false);
    btnRandom.innerHTML = originalText; btnRandom.disabled = false;

    if (data) {
        const promptData = Array.isArray(data) ? data[0] : data;
        activePromptData = { text: promptData.content, image: null };
        let titleHtml = `**${promptData.title}**\n\n${promptData.content} \n\n[Nguồn tham khảo](${promptData.source_link})`;

        if(currentSkill === 'speaking') {
            document.getElementById('speaking-question-grid-container').classList.add('hidden');
            document.getElementById('active-speaking-prompt-box').classList.remove('hidden');
            document.getElementById('speaking-tabs').innerHTML = '';
            speakingPromptText.innerHTML = marked.parse(titleHtml);
            document.getElementById('speaking-prompt-image').classList.add('hidden');
        } else {
            document.getElementById('writing-question-grid-container').classList.add('hidden');
            document.getElementById('active-writing-prompt-box').classList.remove('hidden');
            document.getElementById('writing-tabs').innerHTML = '';
            writingPromptText.innerHTML = marked.parse(titleHtml);
            document.getElementById('writing-prompt-image').classList.add('hidden');
            preloadHintsLogic();
        }
        startPrepTimer();
    } else { alert('Lỗi tạo đề ngẫu nhiên.'); }
});

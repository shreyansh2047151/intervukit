// Global Variables
const API_KEY = 'AIzaSyDRmBkiS77uVEjJcS1cds8c0jFhGUFMpW4';
const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Initialize PDF.js library
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// State Management
const state = {
    resumes: [],
    jobDescription: '',
    results: {
        best: [],
        better: [],
        good: []
    },
    isProcessing: false
};

// DOM Elements
const resumeUploadBtn = document.getElementById('resume-upload-btn');
const resumeUpload = document.getElementById('resume-upload');
const resumeUploadBox = document.getElementById('resume-upload-box');
const resumeCount = document.getElementById('resume-count');

const jdUploadBtn = document.getElementById('jd-upload-btn');
const jdUpload = document.getElementById('jd-upload');
const jdUploadBox = document.getElementById('jd-upload-box');
const jdTextarea = document.getElementById('jd-text');
const jdCount = document.getElementById('jd-count');

const analyzeBtn = document.getElementById('analyze-btn');
const loaderSection = document.getElementById('loader-section');
const loaderProgress = document.getElementById('loader-progress');
const loaderText = document.getElementById('loader-text');
const resultsSection = document.getElementById('results-section');
const resultsSummary = document.getElementById('results-summary');

const bestList = document.getElementById('best-list');
const betterList = document.getElementById('better-list');
const goodList = document.getElementById('good-list');

const categoryTabs = document.querySelectorAll('.category-tab');
const categoryContents = document.querySelectorAll('.category-content');

const overlay = document.getElementById('overlay');
const closePreview = document.getElementById('close-preview');
const previewTitle = document.getElementById('preview-title');
const previewScore = document.getElementById('preview-score');
const previewCategory = document.getElementById('preview-category');
const previewStrengths = document.getElementById('preview-strengths');
const previewMissing = document.getElementById('preview-missing');
const previewText = document.getElementById('preview-text');

// Event Listeners
document.addEventListener('DOMContentLoaded', setupEventListeners);

function setupEventListeners() {
    // Resume Upload
    resumeUploadBtn.addEventListener('click', () => resumeUpload.click());
    resumeUpload.addEventListener('change', handleResumeUpload);
    resumeUploadBox.addEventListener('dragover', handleDragOver);
    resumeUploadBox.addEventListener('drop', handleResumeDrop);
    
    // Job Description Upload
    jdUploadBtn.addEventListener('click', () => jdUpload.click());
    jdUpload.addEventListener('change', handleJDUpload);
    jdUploadBox.addEventListener('dragover', handleDragOver);
    jdUploadBox.addEventListener('drop', handleJDDrop);
    jdTextarea.addEventListener('input', updateAnalyzeButton);
    
    // Analysis
    analyzeBtn.addEventListener('click', startAnalysis);
    
    // Category Tabs
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            switchCategory(category);
        });
    });
    
    // Preview close
    closePreview.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
    
    // Close preview when clicking outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });
}

// File Handling Functions
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.borderColor = 'var(--primary-color)';
    this.style.backgroundColor = 'rgba(30, 136, 229, 0.05)';
}

function handleResumeDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.borderColor = '';
    this.style.backgroundColor = '';
    
    if (e.dataTransfer.files.length > 0) {
        handleResumeFiles(e.dataTransfer.files);
    }
}

function handleJDDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.style.borderColor = '';
    this.style.backgroundColor = '';
    
    if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type === 'application/pdf') {
        handleJDFile(e.dataTransfer.files[0]);
    }
}

function handleResumeUpload(e) {
    if (e.target.files.length > 0) {
        handleResumeFiles(e.target.files);
    }
}

function handleJDUpload(e) {
    if (e.target.files.length > 0) {
        handleJDFile(e.target.files[0]);
    }
}

async function handleResumeFiles(files) {
    // Filter for PDF files only
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
        alert('Please upload PDF files only');
        return;
    }
    
    // Process each PDF file
    for (const file of pdfFiles) {
        try {
            const text = await extractTextFromPDF(file);
            state.resumes.push({
                name: file.name,
                text: text,
                size: formatFileSize(file.size)
            });
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
        }
    }
    
    // Update the UI
    updateResumeCount();
    updateAnalyzeButton();
}

async function handleJDFile(file) {
    try {
        const text = await extractTextFromPDF(file);
        jdTextarea.value = text;
        jdCount.textContent = file.name;
        state.jobDescription = text;
        updateAnalyzeButton();
    } catch (error) {
        console.error('Error processing job description:', error);
    }
}

async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        
        fileReader.onload = async function(event) {
            try {
                const typedArray = new Uint8Array(event.target.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let fullText = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

function updateResumeCount() {
    resumeCount.textContent = `${state.resumes.length} file${state.resumes.length !== 1 ? 's' : ''} selected`;
}

function updateAnalyzeButton() {
    analyzeBtn.disabled = !(state.resumes.length > 0 && (state.jobDescription || jdTextarea.value.trim()));
    
    // If there's text in the textarea, update the state
    if (jdTextarea.value.trim()) {
        state.jobDescription = jdTextarea.value.trim();
    }
}

// Analysis Functions
async function startAnalysis() {
    if (state.isProcessing) return;
    
    state.isProcessing = true;
    state.jobDescription = jdTextarea.value.trim();
    
    // Show loader and hide other sections
    loaderSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    // Reset results
    state.results = {
        best: [],
        better: [],
        good: []
    };
    
    try {
        // Process each resume
        const totalResumes = state.resumes.length;
        
        for (let i = 0; i < totalResumes; i++) {
            const resume = state.resumes[i];
            
            // Update loader
            const progress = ((i + 1) / totalResumes) * 100;
            loaderProgress.style.width = `${progress}%`;
            loaderText.textContent = `Analyzing resume ${i + 1} of ${totalResumes}: ${resume.name}`;
            
            // Give the UI time to update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Analyze the resume
            const result = await analyzeResume(resume, state.jobDescription);
            
            // Categorize the result
            if (result.score >= 80) {
                state.results.best.push(result);
            } else if (result.score >= 60) {
                state.results.better.push(result);
            } else {
                state.results.good.push(result);
            }
        }
        
        // Sort results by score (highest first)
        state.results.best.sort((a, b) => b.score - a.score);
        state.results.better.sort((a, b) => b.score - a.score);
        state.results.good.sort((a, b) => b.score - a.score);
        
        // Display results
        displayResults();
        
    } catch (error) {
        console.error('Analysis error:', error);
        alert('An error occurred during analysis. Please try again.');
    } finally {
        state.isProcessing = false;
        
        // Once done, update UI to show results
        loaderSection.style.display = 'none';
        resultsSection.style.display = 'block';
    }
}

async function analyzeResume(resume, jobDescription) {
    // Prepare prompt for Gemini API
    const prompt = `
    You are an AI resume analyzer. Analyze this resume against the job description and provide a matching score from 0-100.
    
    JOB DESCRIPTION:
    ${jobDescription}
    
    RESUME:
    ${resume.text}
    
    Provide your analysis in the following JSON format:
    {
      "score": <number from 0-100>,
      "keyStrengths": ["strength1", "strength2", "strength3"],
      "missingSkills": ["skill1", "skill2", "skill3"],
      "summary": "brief summary of fit"
    }
    
    Return ONLY the JSON with no additional text.
    `;
    
    try {
        // Call Gemini API
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract the JSON response
        let jsonResponse;
        try {
            // The response might be in different formats depending on the API version
            const responseText = data.candidates[0].content.parts[0].text;
            
            // Extract JSON from the response text (handling potential markdown code blocks)
            const jsonMatch = responseText.match(/```json\n?(.*)\n?```|^\s*(\{.*\})\s*$/s);
            const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[2]) : responseText;
            
            jsonResponse = JSON.parse(jsonString.trim());
        } catch (parseError) {
            console.error('Error parsing API response:', parseError);
            // Fallback to default values if parsing fails
            jsonResponse = {
                score: 50,
                keyStrengths: ["Could not analyze properly"],
                missingSkills: ["Could not analyze properly"],
                summary: "Error analyzing this resume"
            };
        }
        
        // Return combined result
        return {
            name: resume.name,
            size: resume.size,
            text: resume.text,
            score: jsonResponse.score,
            keyStrengths: jsonResponse.keyStrengths || [],
            missingSkills: jsonResponse.missingSkills || [],
            summary: jsonResponse.summary || "No summary provided"
        };
        
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Return default values if API call fails
        return {
            name: resume.name,
            size: resume.size,
            text: resume.text,
            score: 30,
            keyStrengths: ["Error in analysis"],
            missingSkills: ["Could not determine"],
            summary: "Failed to analyze this resume"
        };
    }
}

// Results Display Functions
function displayResults() {
    // Update summary text
    const totalMatches = state.results.best.length + state.results.better.length + state.results.good.length;
    resultsSummary.textContent = `Found ${totalMatches} matches from ${state.resumes.length} resumes.`;
    
    // Clear previous results
    bestList.innerHTML = '';
    betterList.innerHTML = '';
    goodList.innerHTML = '';
    
    // Display each category
    displayCategory('best', state.results.best);
    displayCategory('better', state.results.better);
    displayCategory('good', state.results.good);
    
    // Switch to the category with the most results, or 'best' by default
    let mostPopulatedCategory = 'best';
    let maxCount = state.results.best.length;
    
    if (state.results.better.length > maxCount) {
        mostPopulatedCategory = 'better';
        maxCount = state.results.better.length;
    }
    
    if (state.results.good.length > maxCount) {
        mostPopulatedCategory = 'good';
    }
    
    switchCategory(mostPopulatedCategory);
}

function displayCategory(category, results) {
    const listElement = document.getElementById(`${category}-list`);
    const emptyState = listElement.parentElement.querySelector('.empty-state');
    
    if (results.length === 0) {
        // Show empty state
        emptyState.style.display = 'block';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Display results
    results.forEach(result => {
        const resumeCard = createResumeCard(result, category);
        listElement.appendChild(resumeCard);
    });
}

function createResumeCard(result, category) {
    const card = document.createElement('div');
    card.className = 'resume-card';
    
    // Get a short version of the file name (remove extension)
    const shortName = result.name.replace(/\.[^/.]+$/, "");
    
    // Create content
    card.innerHTML = `
        <div class="resume-match">${result.score}%</div>
        <div class="resume-name">${shortName}</div>
        <div class="resume-details">${result.size}</div>
        <p>${result.summary}</p>
        <div class="tag-container">
            ${result.keyStrengths.slice(0, 3).map(strength => `<span class="tag">${strength}</span>`).join('')}
        </div>
    `;
    
    // Add click event to open preview
    card.addEventListener('click', () => {
        showResumePreview(result, category);
    });
    
    return card;
}

function showResumePreview(result, category) {
    // Update preview content
    previewTitle.textContent = result.name;
    previewScore.textContent = `${result.score}%`;
    
    // Set category display
    let categoryDisplay = 'Unknown';
    if (category === 'best') categoryDisplay = 'Best Fit';
    else if (category === 'better') categoryDisplay = 'Better Fit';
    else if (category === 'good') categoryDisplay = 'Good Fit';
    previewCategory.textContent = categoryDisplay;
    
    // Update strengths and missing skills
    previewStrengths.innerHTML = '';
    result.keyStrengths.forEach(strength => {
        const li = document.createElement('li');
        li.textContent = strength;
        previewStrengths.appendChild(li);
    });
    
    previewMissing.innerHTML = '';
    result.missingSkills.forEach(skill => {
        const li = document.createElement('li');
        li.textContent = skill;
        previewMissing.appendChild(li);
    });
    
    // Update resume text
    previewText.textContent = result.text;
    
    // Show overlay
    overlay.style.display = 'flex';
}

function switchCategory(category) {
    // Update tabs
    categoryTabs.forEach(tab => {
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update content
    categoryContents.forEach(content => {
        if (content.id === `${category}-fit`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}
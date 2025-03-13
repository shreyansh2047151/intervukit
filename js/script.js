// script.js
const { jsPDF } = window.jspdf;

async function generateKit() {
    const loader = document.getElementById('loader');
    loader.style.display = 'block';

    try {
        // Get all inputs
        const inputs = {
            resume: document.getElementById('resume').files[0],
            jobDescText: document.getElementById('jobDescText').value,
            jobDescFile: document.getElementById('jobDescFile').files[0],
            companyWebsite: document.getElementById('companyWebsite').value,
            linkedin: document.getElementById('linkedin').value,
            duration: document.getElementById('interviewDuration').value
        };

        // Validate inputs
        if (!inputs.resume) throw new Error('Please upload your resume');
        if (!inputs.companyWebsite) throw new Error('Company website is required');

        // Read files
        const resumeText = inputs.resume ? await readPDF(inputs.resume) : '';
        const jobDescText = inputs.jobDescText || (inputs.jobDescFile ? await readPDF(inputs.jobDescFile) : '');
        
        if (!resumeText) throw new Error('Failed to read resume PDF');
        if (!jobDescText) throw new Error('Job description is required');

        // Generate content with Gemini
        const content = await generateAIContent({
            resume: resumeText,
            jobDesc: jobDescText,
            website: inputs.companyWebsite,
            linkedin: inputs.linkedin,
            duration: inputs.duration
        });

        // Create PDF
        const pdf = new jsPDF();

        // Function to add text with bold formatting
        function addFormattedText(text, x, y) {
            let currentX = x;
            const words = text.split(' ');
            let currentLine = '';
            const maxWidth = 160;

            for (const word of words) {
                let formattedWord = word;
                let isBold = false;

                if (word.startsWith('**') && word.endsWith('**')) {
                    formattedWord = word.slice(2, word.length - 2);
                    isBold = true;
                }

                const testLine = currentLine ? `${currentLine} ${formattedWord}` : formattedWord;
                const testWidth = pdf.getTextWidth(testLine);

                if (testWidth > maxWidth) {
                    pdf.text(currentLine, x, y);
                    y += 7;
                    currentLine = formattedWord;
                } else {
                    currentLine = testLine;
                }
            }
            pdf.text(currentLine, x, y);
            return y;
        }
        
        // Interview Questions
        pdf.setFontSize(18);
        pdf.text("Technical Questions", 20, 20);
        pdf.setFontSize(12);
        
        let y = 30;
        y += 10;
        const technicalQuestions = content.questions.split('**Behavioral Questions:**')[0].trim();
        const technicalLines = technicalQuestions.split('\n').filter(line => line.trim());
        technicalLines.forEach((line) => {
            y = addFormattedText(line, 20, y);
            y += 7;
        });

        // Behavioral Questions on a new page
        pdf.addPage();
        pdf.setFontSize(18);
        pdf.text("Behavioral Questions", 20, 20);
        pdf.setFontSize(12);
        
        y = 30;
        y += 10;
        const behavioralQuestions = content.questions.split('**Behavioral Questions:**')[1].trim();
        const behavioralLines = behavioralQuestions.split('\n').filter(line => line.trim());
        behavioralLines.forEach((line) => {
            y = addFormattedText(line, 20, y);
            y += 7;
        });

        // Company Info
        pdf.addPage();
        pdf.setFontSize(18);
        pdf.text("Company Information", 20, 20);
        pdf.setFontSize(12);
        
        y = 30;
        const companyInfo = content.companyInfo.split('\n').filter(line => line.trim());
        companyInfo.forEach((line) => {
            y = addFormattedText(line, 20, y);
            y += 7;
        });

        // Resume Analysis
        pdf.addPage();
        pdf.setFontSize(18);
        pdf.text("Resume Analysis", 20, 20);
        pdf.setFontSize(12);
        
        y = 30;
        const analysis = content.analysis.split('\n').filter(line => line.trim());
        analysis.forEach((line) => {
            y = addFormattedText(line, 20, y);
            y += 7;
        });

        // Final Message
        pdf.addPage();
        pdf.setFontSize(18);
        pdf.text("All the Best!", 20, 20);
        pdf.setFontSize(12);
        pdf.text("You've got this! Remember to stay confident and showcase your skills.", 20, 30);

        // Save PDF
        pdf.save('Interview_Kit.pdf');

    } catch (error) {
        alert('Error: ' + (error.message || 'Something went wrong. Please try again.'));
    } finally {
        loader.style.display = 'none';
    }
}

async function generateAIContent(data) {
    const prompt = `Generate interview kit with these exact sections:
    
    ###Questions:
    [List 15-20 technical and behavioral questions based on resume and job description]
    Format as:
    **Technical Questions:**
    1. Question1
    2. Question2
    
    **Behavioral Questions:**
    1. Question1
    2. Question2
    
    ###Company Info:
    [Company overview, services/products, recent news from ${data.website}]
    Format as:
    **Company Overview:**
    [Overview]
    
    **Services/Products:**
    [List]
    
    ###Resume Analysis:
    - Relevance: X%
    - Strengths: [3-5 points]
    - Weaknesses: [3-5 points]
    
    Use this data:
    Resume: ${data.resume.substring(0, 3000)}
    Job Description: ${data.jobDesc.substring(0, 3000)}
    Interview Duration: ${data.duration} minutes`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCYpbMDH8xF-vPltAgJ9LGBnXJ8MNOrUH4', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({contents: [{parts: [{text: prompt}]}]})
    });

    if (!response.ok) throw new Error('API request failed');
    
    const result = await response.json();
    const fullText = result.candidates[0].content.parts[0].text;
    
    // Validate response structure
    if (!fullText.includes('###Questions:') || !fullText.includes('###Company Info:')) {
        throw new Error('Unexpected response format from AI');
    }
    
    return {
        questions: fullText.split('###Questions:')[1].split('###Company Info:')[0].trim(),
        companyInfo: fullText.split('###Company Info:')[1].split('###Resume Analysis:')[0].trim(),
        analysis: fullText.split('###Resume Analysis:')[1].trim()
    };
}

async function readPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const pdf = await pdfjsLib.getDocument(e.target.result).promise;
                let text = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => item.str).join(' ') + '\n';
                }
                resolve(text.substring(0, 5000)); // Limit to 5000 characters
            } catch (error) {
                reject(new Error('Failed to read PDF: ' + (error.message || 'Invalid PDF file')));
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsArrayBuffer(file);
    });
}

import { streamGemini } from './gemini-api.js';

class ChatUI {
    constructor() {
        this.form = document.querySelector('form');
        this.promptInput = document.querySelector('input[name="prompt"]');
        this.chatHistory = document.querySelector('#chat-history');
        this.md = new markdownit();
        this.conversations = [];
        this.feedbackStates = new Map();
        this.initialize();
        this.startNewChat();
    }

    initialize() {
        this.form.onsubmit = (ev) => this.handleSubmit(ev);
    }

    startNewChat() {
        this.conversations = [];
        this.chatHistory.innerHTML = '';
        this.promptInput.value = '';
        
        const welcomeMessage = {
            role: 'bot',
            content: "Welcome to PaddockPal! I'm your F1 expert assistant. How can I help you today? 🏎️"
        };
        this.addMessage(welcomeMessage.role, welcomeMessage.content);
    }

    renderConversationHistory() {
        this.chatHistory.innerHTML = '';
        this.conversations.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.chatHistory.appendChild(messageElement);
        });
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.role}`;
        div.innerHTML = message.role === 'user' ? 
            message.content : 
            this.md.render(message.content);
        return div;
    }

    addMessage(role, content) {
        this.conversations.push({ role, content });
        this.renderConversationHistory();
    }

    createTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'message bot typing-indicator';
        div.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        return div;
    }

    scrollToBottom() {
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.role}`;
        
        if (message.role === 'bot') {
            div.innerHTML = `
                ${this.md.render(message.content)}
                <div class="message-feedback">
                    <button class="feedback-btn" data-type="up">
                        <span class="material-icons">thumb_up</span>
                    </button>
                    <button class="feedback-btn" data-type="down">
                        <span class="material-icons">thumb_down</span>
                    </button>
                </div>
            `;
            
            const feedbackBtns = div.querySelectorAll('.feedback-btn');
            feedbackBtns.forEach(btn => {
                btn.addEventListener('click', () => this.handleFeedback(message, btn));
            });
        } else {
            div.innerHTML = message.content;
        }
        
        return div;
    }

    async handleFeedback(messageId, clickedBtn) {
        const feedbackType = clickedBtn.dataset.type;
        const btns = clickedBtn.parentElement.querySelectorAll('.feedback-btn');
        
        // If clicking already active button, remove feedback
        if (clickedBtn.classList.contains('active')) {
            clickedBtn.classList.remove('active');
            clickedBtn.setAttribute('aria-pressed', 'false');
            clickedBtn.style.transform = 'scale(1)';
            return;
        }
        
        // Remove active state from all buttons
        btns.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
            btn.style.transform = 'scale(1)';
        });
        
        // Add active state to clicked button
        clickedBtn.classList.add('active');
        clickedBtn.setAttribute('aria-pressed', 'true');
        
        // Add click animation
        clickedBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            clickedBtn.style.transform = 'scale(1.1)';
        }, 100);
        
        // try {
        //     await this.saveFeedback(messageId, feedbackType);
        // } catch (error) {
        //     console.error('Error saving feedback:', error);
        // }
    }
    

    // async saveFeedback(messageId, feedbackType) {
    //     try {
    //         const response = await fetch('/api/feedback', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ messageId, feedbackType })
    //         });
            
    //         if (!response.ok) {
    //             console.error('Failed to save feedback');
    //         }
    //     } catch (error) {
    //         console.error('Error saving feedback:', error);
    //     }
    // }

    async handleSubmit(ev) {
        ev.preventDefault();
        
        const userInput = this.promptInput.value.trim();
        if (!userInput) return;
    
        this.addMessage('user', userInput);
        this.promptInput.value = '';
    
        const typingIndicator = this.createTypingIndicator();
        this.chatHistory.appendChild(typingIndicator);
        this.scrollToBottom();
    
        try {
            let contents = [{
                role: 'user',
                parts: [{ text: userInput }]
            }];
    
            let stream = streamGemini({
                model: 'gemini-2.0-flash',
                contents
            });
    
            let buffer = '';
            for await (const chunk of stream) {
                if (chunk) {
                    buffer += chunk;
                    typingIndicator.innerHTML = this.md.render(buffer);
                    this.scrollToBottom();
                }
            }
    
            typingIndicator.remove();
            if (buffer.length > 0) {
                this.addMessage('bot', buffer);
            } else {
                this.addMessage('bot', 'Sorry, I could not generate a response.');
            }
    
        } catch (e) {
            console.error('Chat error:', e);
            typingIndicator.remove();
            this.addMessage('bot', `Error: ${e.message}`);
        }
    }
        
}

// Initialize the chat UI
const chat = new ChatUI();

class ThemeManager {
    constructor() {
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.themeToggle = document.getElementById('themeToggle');
        this.icon = this.themeToggle.querySelector('.material-icons');
        this.initialize();
    }

    initialize() {
        // Set initial theme based on saved preference
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            this.themeToggle.classList.add('dark');
            this.icon.textContent = 'dark_mode';
        } else {
            this.icon.textContent = 'light_mode';
        }

        // Check system preference if no saved preference
        if (localStorage.getItem('darkMode') === null) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.darkMode = prefersDark;
            this.applyTheme();
        }

        // Add event listener for theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e) => {
                if (localStorage.getItem('darkMode') === null) {
                    this.darkMode = e.matches;
                    this.applyTheme();
                }
            });
    }

    toggleTheme() {
        this.darkMode = !this.darkMode;
        this.applyTheme();
        
        // Animate the icon
        this.icon.style.transition = 'transform 0.5s ease-in-out';
        this.icon.style.transform = `rotate(${this.darkMode ? 360 : 0}deg)`;
        
        // Save preference
        localStorage.setItem('darkMode', this.darkMode);
    }

    applyTheme() {
        // Apply theme to body
        document.body.classList.toggle('dark-mode', this.darkMode);
        
        // Update button state
        this.themeToggle.classList.toggle('dark', this.darkMode);
        
        // Update icon
        requestAnimationFrame(() => {
            this.icon.textContent = this.darkMode ? 'dark_mode' : 'light_mode';
        });
    }

    // Helper method to get current theme
    isDarkMode() {
        return this.darkMode;
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

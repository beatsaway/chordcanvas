/**
 * Humanisation Module
 * Adds subtle timing variations to chord playback for more natural, human-like feel
 */

(function() {
    'use strict';

    // Humanisation settings
    let humanisationMaxDelay = 0.04; // Default max delay multiplier (4%)
    
    // Initialize humanisation settings from localStorage
    function initHumanisationSettings() {
        const storedMax = localStorage.getItem('humanisationMaxDelay');
        if (storedMax !== null) {
            humanisationMaxDelay = parseFloat(storedMax);
        } else {
            // Default to 4% (0.04)
            humanisationMaxDelay = 0.04;
            localStorage.setItem('humanisationMaxDelay', '0.04');
        }
    }
    
    // Expose function to update max delay
    window.setHumanisationMaxDelay = function(maxDelay) {
        humanisationMaxDelay = Math.max(0.01, Math.min(0.08, maxDelay));
        localStorage.setItem('humanisationMaxDelay', humanisationMaxDelay.toString());
    };
    
    window.getHumanisationMaxDelay = function() {
        return humanisationMaxDelay;
    };
    
    /**
     * Calculate humanisation delay for a note
     * @param {number} duration - Note duration in seconds
     * @returns {number} Delay in seconds (0 if humanisation disabled or not applied)
     */
    window.calculateHumanisationDelay = function(duration) {
        const humanisationEnabled = localStorage.getItem('humanisationEnabled') === 'true';
        
        if (!humanisationEnabled) {
            return 0;
        }
        
        // 78.6% chance to add delay
        if (Math.random() < 0.786) {
            // Random delay between 0.01 and maxDelay (default 0.04, adjustable 0.04-0.08)
            const delayMultiplier = 0.01 + Math.random() * (humanisationMaxDelay - 0.01);
            return duration * delayMultiplier;
        }
        
        return 0;
    };
    
    /**
     * Initialize humanisation settings popup
     */
    window.initHumanisationSettings = function() {
        // Settings are stored in localStorage and managed by the module
    };
    
    /**
     * Open humanisation settings popup
     */
    window.openHumanisationSettings = function() {
        // Create popup if it doesn't exist
        let popup = document.getElementById('humanisation-settings-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'humanisation-settings-popup';
            popup.className = 'humanisation-settings-popup';
            
            const currentMax = window.getHumanisationMaxDelay ? window.getHumanisationMaxDelay() : 0.04;
            const maxPercent = Math.round(currentMax * 100);
            
            popup.innerHTML = `
                <div class="humanisation-settings-popup-content">
                    <div class="humanisation-settings-popup-header">
                        <h2>Humanisation Settings</h2>
                        <button class="humanisation-settings-popup-close">×</button>
                    </div>
                    <div class="humanisation-settings-popup-body">
                        <div class="humanisation-settings-info">
                            <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.7); font-size: 12px; line-height: 1.5;">
                                Humanisation adds subtle timing variations to make chord playback feel more natural. Each note has a <strong>78.6% chance</strong> of receiving a random delay.
                                <br><br>
                                <strong>Max Delay:</strong> Controls the maximum delay percentage (1% to max%) applied to each note. Higher values create more noticeable timing variations.
                            </p>
                        </div>
                        
                        <div class="humanisation-settings-section">
                            <div class="humanisation-settings-setting">
                                <label>
                                    <span>Max Delay</span>
                                    <input type="range" id="humanisation-max-delay" 
                                           min="4" max="8" step="0.1" value="${maxPercent}">
                                    <span class="humanisation-settings-value" id="humanisation-max-delay-value">${maxPercent}%</span>
                                </label>
                                <div class="humanisation-settings-description">
                                    Maximum delay percentage: 4% (subtle) to 8% (more noticeable). Default: 4%
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="humanisation-settings-popup-footer">
                        <button class="humanisation-settings-reset">Reset to Default</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(popup);
            
            // Add styles if not already added
            if (!document.getElementById('humanisation-settings-styles')) {
                const style = document.createElement('style');
                style.id = 'humanisation-settings-styles';
                style.textContent = `
                    .humanisation-settings-popup {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.7);
                        backdrop-filter: blur(5px);
                        z-index: 3000;
                        align-items: center;
                        justify-content: center;
                    }
                    .humanisation-settings-popup.active {
                        display: flex;
                    }
                    .humanisation-settings-popup-content {
                        background: rgba(30, 30, 45, 0.95);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 6px;
                        padding: 24px;
                        max-width: 500px;
                        width: 90%;
                        max-height: 85vh;
                        overflow-y: auto;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                        position: relative;
                    }
                    .humanisation-settings-popup-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .humanisation-settings-popup-header h2 {
                        margin: 0;
                        font-family: 'Lexend', sans-serif;
                        font-weight: 600;
                        font-size: 18px;
                        color: #fff;
                    }
                    .humanisation-settings-popup-close {
                        background: none;
                        border: none;
                        color: #fff;
                        font-size: 28px;
                        cursor: pointer;
                        padding: 0;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 2px;
                        transition: background 0.2s;
                    }
                    .humanisation-settings-popup-close:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    .humanisation-settings-popup-body {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .humanisation-settings-info {
                        padding: 12px;
                        background: rgba(26, 90, 58, 0.1);
                        border: 1px solid rgba(26, 90, 58, 0.3);
                        border-radius: 3px;
                    }
                    .humanisation-settings-section {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 4px;
                    }
                    .humanisation-settings-setting {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    .humanisation-settings-setting label {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        color: #fff;
                        font-family: 'Lexend', sans-serif;
                        font-size: 13px;
                    }
                    .humanisation-settings-setting label span:first-child {
                        min-width: 100px;
                        font-weight: 500;
                    }
                    .humanisation-settings-setting input[type="range"] {
                        flex: 1;
                        height: 6px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 2px;
                        outline: none;
                        -webkit-appearance: none;
                        accent-color: #1a5a3a;
                    }
                    .humanisation-settings-setting input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 16px;
                        height: 16px;
                        background: #1a5a3a;
                        border-radius: 50%;
                        cursor: pointer;
                    }
                    .humanisation-settings-setting input[type="range"]::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        background: #1a5a3a;
                        border-radius: 50%;
                        cursor: pointer;
                        border: none;
                    }
                    .humanisation-settings-value {
                        min-width: 60px;
                        text-align: right;
                        color: #1a5a3a;
                        font-family: 'Lexend', sans-serif;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    .humanisation-settings-description {
                        font-size: 11px;
                        color: rgba(255, 255, 255, 0.6);
                        font-family: 'Lexend', sans-serif;
                        margin-left: 112px;
                        line-height: 1.4;
                    }
                    .humanisation-settings-popup-footer {
                        margin-top: 10px;
                        padding-top: 20px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .humanisation-settings-reset {
                        padding: 8px 16px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 3px;
                        color: #fff;
                        font-family: 'Lexend', sans-serif;
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .humanisation-settings-reset:hover {
                        background: rgba(255, 255, 255, 0.15);
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Setup slider
            const slider = popup.querySelector('#humanisation-max-delay');
            const valueDisplay = popup.querySelector('#humanisation-max-delay-value');
            if (slider && valueDisplay) {
                slider.addEventListener('input', function() {
                    const percent = parseFloat(this.value);
                    valueDisplay.textContent = percent.toFixed(1) + '%';
                    if (window.setHumanisationMaxDelay) {
                        window.setHumanisationMaxDelay(percent / 100);
                    }
                });
            }
            
            // Setup close button
            const closeBtn = popup.querySelector('.humanisation-settings-popup-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    closeHumanisationSettings();
                });
            }
            
            // Close when clicking outside
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    closeHumanisationSettings();
                }
            });
            
            // Setup reset button
            const resetBtn = popup.querySelector('.humanisation-settings-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (window.setHumanisationMaxDelay) {
                        window.setHumanisationMaxDelay(0.04);
                    }
                    if (slider) slider.value = 4;
                    if (valueDisplay) valueDisplay.textContent = '4%';
                });
            }
        }
        
        // Show popup
        popup.classList.add('active');
    };
    
    /**
     * Close humanisation settings popup
     */
    function closeHumanisationSettings() {
        const popup = document.getElementById('humanisation-settings-popup');
        if (popup) {
            popup.classList.remove('active');
        }
    }
    
    window.closeHumanisationSettings = closeHumanisationSettings;
    
    // Initialize on load
    initHumanisationSettings();
})();

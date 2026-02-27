/**
 * VolumeMod Settings Module
 * Controls min and max velocity for volume modulation patterns
 */

(function() {
    'use strict';

    // VolumeMod settings
    let volumeModMinVelocity = 30; // Default min velocity (30-127 range)
    let volumeModMaxVelocity = 127; // Default max velocity (30-127 range)
    
    // Initialize volumemod settings from localStorage
    function initVolumeModSettings() {
        const storedMin = localStorage.getItem('volumeModMinVelocity');
        const storedMax = localStorage.getItem('volumeModMaxVelocity');
        
        if (storedMin !== null) {
            volumeModMinVelocity = parseInt(storedMin);
        } else {
            volumeModMinVelocity = 30;
            localStorage.setItem('volumeModMinVelocity', '30');
        }
        
        if (storedMax !== null) {
            volumeModMaxVelocity = parseInt(storedMax);
        } else {
            volumeModMaxVelocity = 127;
            localStorage.setItem('volumeModMaxVelocity', '127');
        }
    }
    
    // Expose functions to update settings
    window.setVolumeModMinVelocity = function(minVel) {
        volumeModMinVelocity = Math.max(1, Math.min(127, Math.round(minVel)));
        localStorage.setItem('volumeModMinVelocity', volumeModMinVelocity.toString());
    };
    
    window.setVolumeModMaxVelocity = function(maxVel) {
        volumeModMaxVelocity = Math.max(1, Math.min(127, Math.round(maxVel)));
        localStorage.setItem('volumeModMaxVelocity', volumeModMaxVelocity.toString());
    };
    
    window.getVolumeModMinVelocity = function() {
        return volumeModMinVelocity;
    };
    
    window.getVolumeModMaxVelocity = function() {
        return volumeModMaxVelocity;
    };
    
    /**
     * Initialize volumemod settings popup
     */
    window.initVolumeModSettings = function() {
        // Settings are stored in localStorage and managed by the module
        initVolumeModSettings();
    };
    
    /**
     * Open volumemod settings popup
     */
    window.openVolumeModSettings = function() {
        // Create popup if it doesn't exist
        let popup = document.getElementById('volumemod-settings-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'volumemod-settings-popup';
            popup.className = 'volumemod-settings-popup';
            
            const currentMin = window.getVolumeModMinVelocity ? window.getVolumeModMinVelocity() : 30;
            const currentMax = window.getVolumeModMaxVelocity ? window.getVolumeModMaxVelocity() : 127;
            
            popup.innerHTML = `
                <div class="volumemod-settings-popup-content">
                    <div class="volumemod-settings-popup-header">
                        <h2>VolumeMod Settings</h2>
                        <button class="volumemod-settings-popup-close">×</button>
                    </div>
                    <div class="volumemod-settings-popup-body">
                        <div class="volumemod-settings-info">
                            <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.7); font-size: 12px; line-height: 1.5;">
                                VolumeMod adjusts note velocity dynamically based on the selected pattern (uphill, downhill, valley, hill, etc.) within each 240/bpm cycle.
                                <br><br>
                                <strong>Min Velocity:</strong> The lowest velocity value used in volume modulation patterns (e.g., start of downhill, bottom of valley).
                                <br><br>
                                <strong>Max Velocity:</strong> The highest velocity value used in volume modulation patterns (e.g., end of uphill, peak of hill).
                            </p>
                        </div>
                        
                        <div class="volumemod-settings-section">
                            <div class="volumemod-settings-setting">
                                <label>
                                    <span>Min Velocity</span>
                                    <input type="range" id="volumemod-min-velocity" 
                                           min="1" max="127" step="1" value="${currentMin}">
                                    <span class="volumemod-settings-value" id="volumemod-min-velocity-value">${currentMin}</span>
                                </label>
                                <div class="volumemod-settings-description">
                                    Minimum velocity: 1 (very quiet) to 127 (full volume). Default: 30
                                </div>
                            </div>
                            
                            <div class="volumemod-settings-setting">
                                <label>
                                    <span>Max Velocity</span>
                                    <input type="range" id="volumemod-max-velocity" 
                                           min="1" max="127" step="1" value="${currentMax}">
                                    <span class="volumemod-settings-value" id="volumemod-max-velocity-value">${currentMax}</span>
                                </label>
                                <div class="volumemod-settings-description">
                                    Maximum velocity: 1 (very quiet) to 127 (full volume). Default: 127
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="volumemod-settings-popup-footer">
                        <button class="volumemod-settings-reset">Reset to Default</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(popup);
            
            // Add styles if not already added
            if (!document.getElementById('volumemod-settings-styles')) {
                const style = document.createElement('style');
                style.id = 'volumemod-settings-styles';
                style.textContent = `
                    .volumemod-settings-popup {
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
                    .volumemod-settings-popup.active {
                        display: flex;
                    }
                    .volumemod-settings-popup-content {
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
                    .volumemod-settings-popup-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .volumemod-settings-popup-header h2 {
                        margin: 0;
                        font-family: 'Lexend', sans-serif;
                        font-weight: 600;
                        font-size: 18px;
                        color: #fff;
                    }
                    .volumemod-settings-popup-close {
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
                    .volumemod-settings-popup-close:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    .volumemod-settings-popup-body {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .volumemod-settings-info {
                        padding: 12px;
                        background: rgba(26, 90, 58, 0.1);
                        border: 1px solid rgba(26, 90, 58, 0.3);
                        border-radius: 3px;
                    }
                    .volumemod-settings-section {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 4px;
                    }
                    .volumemod-settings-setting {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }
                    .volumemod-settings-setting label {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        color: #fff;
                        font-family: 'Lexend', sans-serif;
                        font-size: 13px;
                    }
                    .volumemod-settings-setting label span:first-child {
                        min-width: 100px;
                        font-weight: 500;
                    }
                    .volumemod-settings-setting input[type="range"] {
                        flex: 1;
                        height: 6px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 2px;
                        outline: none;
                        -webkit-appearance: none;
                        accent-color: #1a5a3a;
                    }
                    .volumemod-settings-setting input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 16px;
                        height: 16px;
                        background: #1a5a3a;
                        border-radius: 50%;
                        cursor: pointer;
                    }
                    .volumemod-settings-setting input[type="range"]::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        background: #1a5a3a;
                        border-radius: 50%;
                        cursor: pointer;
                        border: none;
                    }
                    .volumemod-settings-value {
                        min-width: 60px;
                        text-align: right;
                        color: #1a5a3a;
                        font-family: 'Lexend', sans-serif;
                        font-size: 12px;
                        font-weight: 500;
                    }
                    .volumemod-settings-description {
                        font-size: 11px;
                        color: rgba(255, 255, 255, 0.6);
                        font-family: 'Lexend', sans-serif;
                        margin-left: 112px;
                        line-height: 1.4;
                    }
                    .volumemod-settings-popup-footer {
                        margin-top: 10px;
                        padding-top: 20px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .volumemod-settings-reset {
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
                    .volumemod-settings-reset:hover {
                        background: rgba(255, 255, 255, 0.15);
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Setup sliders
            const minSlider = popup.querySelector('#volumemod-min-velocity');
            const minValueDisplay = popup.querySelector('#volumemod-min-velocity-value');
            const maxSlider = popup.querySelector('#volumemod-max-velocity');
            const maxValueDisplay = popup.querySelector('#volumemod-max-velocity-value');
            
            if (minSlider && minValueDisplay) {
                minSlider.addEventListener('input', function() {
                    const value = parseInt(this.value);
                    // Ensure min doesn't exceed max
                    if (value > parseInt(maxSlider.value)) {
                        this.value = maxSlider.value;
                        minValueDisplay.textContent = maxSlider.value;
                        if (window.setVolumeModMinVelocity) {
                            window.setVolumeModMinVelocity(parseInt(maxSlider.value));
                        }
                    } else {
                        minValueDisplay.textContent = value;
                        if (window.setVolumeModMinVelocity) {
                            window.setVolumeModMinVelocity(value);
                        }
                    }
                });
            }
            
            if (maxSlider && maxValueDisplay) {
                maxSlider.addEventListener('input', function() {
                    const value = parseInt(this.value);
                    // Ensure max doesn't go below min
                    if (value < parseInt(minSlider.value)) {
                        this.value = minSlider.value;
                        maxValueDisplay.textContent = minSlider.value;
                        if (window.setVolumeModMaxVelocity) {
                            window.setVolumeModMaxVelocity(parseInt(minSlider.value));
                        }
                    } else {
                        maxValueDisplay.textContent = value;
                        if (window.setVolumeModMaxVelocity) {
                            window.setVolumeModMaxVelocity(value);
                        }
                    }
                });
            }
            
            // Setup close button
            const closeBtn = popup.querySelector('.volumemod-settings-popup-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    closeVolumeModSettings();
                });
            }
            
            // Close when clicking outside
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    closeVolumeModSettings();
                }
            });
            
            // Setup reset button
            const resetBtn = popup.querySelector('.volumemod-settings-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (window.setVolumeModMinVelocity) {
                        window.setVolumeModMinVelocity(30);
                    }
                    if (window.setVolumeModMaxVelocity) {
                        window.setVolumeModMaxVelocity(127);
                    }
                    if (minSlider) minSlider.value = 30;
                    if (minValueDisplay) minValueDisplay.textContent = '30';
                    if (maxSlider) maxSlider.value = 127;
                    if (maxValueDisplay) maxValueDisplay.textContent = '127';
                });
            }
        }
        
        // Update popup with current values if it already exists
        const minSlider = popup.querySelector('#volumemod-min-velocity');
        const minValueDisplay = popup.querySelector('#volumemod-min-velocity-value');
        const maxSlider = popup.querySelector('#volumemod-max-velocity');
        const maxValueDisplay = popup.querySelector('#volumemod-max-velocity-value');
        
        if (minSlider && minValueDisplay) {
            const currentMin = window.getVolumeModMinVelocity ? window.getVolumeModMinVelocity() : 30;
            minSlider.value = currentMin;
            minValueDisplay.textContent = currentMin;
        }
        
        if (maxSlider && maxValueDisplay) {
            const currentMax = window.getVolumeModMaxVelocity ? window.getVolumeModMaxVelocity() : 127;
            maxSlider.value = currentMax;
            maxValueDisplay.textContent = currentMax;
        }
        
        // Show popup
        popup.classList.add('active');
    };
    
    /**
     * Close volumemod settings popup
     */
    function closeVolumeModSettings() {
        const popup = document.getElementById('volumemod-settings-popup');
        if (popup) {
            popup.classList.remove('active');
        }
    }
    
    window.closeVolumeModSettings = closeVolumeModSettings;
    
    // Initialize on load
    initVolumeModSettings();
})();

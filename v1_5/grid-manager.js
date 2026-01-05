// Grid Manager Module
// Handles creation, interaction, and animation of tempo grids

class GridManager {
    constructor(config) {
        this.durationMultipliers = config.durationMultipliers || [null, 240, 120, 60, 40, 30, 20, 15];
        this.getIsPlaying = config.getIsPlaying || (() => false);
        this.getCurrentBPM = config.getCurrentBPM || (() => 120);
        this.onCellClick = config.onCellClick || (() => {});
    }

    createGrid(gridId, synthType) {
        const grid = document.getElementById(gridId);
        if (!grid) {
            console.error(`Grid element not found: ${gridId}`);
            return;
        }

        const headers = ['', '240/bpm', '120/bpm', '60/bpm', '40/bpm', '30/bpm', '20/bpm', '15/bpm'];
        
        // Sub grid is 8x8 like others (column = lowest note tempo, row = octave lower tempo)
        if (synthType === 'sub') {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-cell';
                    cell.dataset.synthType = synthType;
                    
                    if (row === 0 || col === 0) {
                        cell.className += ' header';
                        if (row === 0 && col === 0) {
                            cell.textContent = '';
                        } else if (row === 0) {
                            cell.className += ' col-header'; // First row = column headers (high notes)
                            cell.textContent = headers[col];
                        } else {
                            cell.className += ' row-header'; // First column = row headers (bass)
                            cell.textContent = headers[row];
                        }
                    } else {
                        cell.dataset.row = row;
                        cell.dataset.col = col;
                        cell.addEventListener('click', () => {
                            this.handleCellClick(row, col, synthType, cell);
                        });
                    }
                    
                    grid.appendChild(cell);
                }
            }
        } else {
            // Regular 8x8 grid for water and plucky
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'grid-cell';
                    cell.dataset.synthType = synthType;
                    
                    if (row === 0 || col === 0) {
                        cell.className += ' header';
                        if (row === 0 && col === 0) {
                            cell.textContent = '';
                        } else if (row === 0) {
                            cell.className += ' col-header'; // First row = column headers (high notes)
                            cell.textContent = headers[col];
                        } else {
                            cell.className += ' row-header'; // First column = row headers (bass)
                            cell.textContent = headers[row];
                        }
                    } else {
                        cell.dataset.row = row;
                        cell.dataset.col = col;
                        cell.addEventListener('click', () => {
                            this.handleCellClick(row, col, synthType, cell);
                        });
                    }
                    
                    grid.appendChild(cell);
                }
            }
        }
    }

    handleCellClick(row, col, synthType, cell) {
        const bassDurationMultiplier = this.durationMultipliers[row];
        const highDurationMultiplier = this.durationMultipliers[col];
        
        if (!bassDurationMultiplier || !isFinite(bassDurationMultiplier) || bassDurationMultiplier <= 0 ||
            !highDurationMultiplier || !isFinite(highDurationMultiplier) || highDurationMultiplier <= 0) {
            console.error('Invalid duration multipliers');
            return;
        }
        
        const isPlaying = this.getIsPlaying();
        
        // Call the callback to handle state updates
        this.onCellClick(synthType, row, col, bassDurationMultiplier, highDurationMultiplier, isPlaying, cell);
    }

    updateGridHeaderAnimations(gridId, bassDuration, highDuration, synthType, activeRow, activeCol) {
        // Stop all animations first
        document.querySelectorAll(`#${gridId} .grid-cell.header.animated`).forEach(header => {
            header.classList.remove('animated');
            header.style.animationDuration = '';
        });
        
        const isPlaying = this.getIsPlaying();
        const currentBPM = this.getCurrentBPM();
        
        if (!isPlaying || !bassDuration || !highDuration || activeRow === null || activeCol === null) {
            return;
        }
        
        const bassCycleDuration = bassDuration / currentBPM; // in seconds
        const highCycleDuration = highDuration / currentBPM; // in seconds
        
        // Get all cells in the grid
        const allCells = document.querySelectorAll(`#${gridId} .grid-cell`);
        
        if (synthType === 'sub') {
            // Sub grid: column = bass (lowest note), row = octave
            // Animate only the specific column header (col = activeCol, row = 0) with octave tempo
            const colHeaderIndex = activeCol; // Column headers are in row 0
            if (allCells[colHeaderIndex] && allCells[colHeaderIndex].classList.contains('col-header')) {
                allCells[colHeaderIndex].classList.add('animated');
                allCells[colHeaderIndex].style.animationDuration = `${highCycleDuration}s`;
            }
            
            // Animate only the specific row header (row = activeRow, col = 0) with bass tempo
            const rowHeaderIndex = activeRow * 8; // Row headers are in column 0
            if (allCells[rowHeaderIndex] && allCells[rowHeaderIndex].classList.contains('row-header')) {
                allCells[rowHeaderIndex].classList.add('animated');
                allCells[rowHeaderIndex].style.animationDuration = `${bassCycleDuration}s`;
            }
        } else {
            // Water/Plucky: row = bass, col = high
            // Animate only the specific row header (row = activeRow, col = 0)
            const rowHeaderIndex = activeRow * 8; // Row headers are in column 0
            if (allCells[rowHeaderIndex] && allCells[rowHeaderIndex].classList.contains('row-header')) {
                allCells[rowHeaderIndex].classList.add('animated');
                allCells[rowHeaderIndex].style.animationDuration = `${bassCycleDuration}s`;
            }
            
            // Animate only the specific column header (col = activeCol, row = 0)
            const colHeaderIndex = activeCol; // Column headers are in row 0
            if (allCells[colHeaderIndex] && allCells[colHeaderIndex].classList.contains('col-header')) {
                allCells[colHeaderIndex].classList.add('animated');
                allCells[colHeaderIndex].style.animationDuration = `${highCycleDuration}s`;
            }
        }
    }

    // Helper method to clear active/pending states for a grid
    clearGridStates(gridId) {
        document.querySelectorAll(`#${gridId} .grid-cell.active`).forEach(c => {
            c.classList.remove('active');
        });
        document.querySelectorAll(`#${gridId} .grid-cell.pending`).forEach(c => {
            c.classList.remove('pending');
        });
    }

    // Helper method to set cell state
    setCellState(gridId, row, col, state) {
        const cell = document.querySelector(`#${gridId} .grid-cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.remove('active', 'pending');
            if (state) {
                cell.classList.add(state);
            }
        }
    }
}


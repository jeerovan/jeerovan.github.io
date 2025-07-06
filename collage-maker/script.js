document.addEventListener('DOMContentLoaded', () => {
    const canvas = new fabric.Canvas('collage-canvas');
    const templateSelect = document.getElementById('template-select');
    const imageUpload = document.getElementById('image-upload');
    const bgColorInput = document.getElementById('bg-color-input');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const exportPngBtn = document.getElementById('export-png-btn');
    const exportJpegBtn = document.getElementById('export-jpeg-btn');
    const copyBtn = document.getElementById('copy-btn');
    const layersPanel = document.getElementById('layers-panel');
    const imageSettingsControls = document.getElementById('image-settings-controls');
    const filterControls = document.getElementById('filter-controls');

    let history = [];
    let historyIndex = -1;
    
    function applyFilter(index, filter) {
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.filters[index] = filter;
            obj.applyFilters();
            canvas.renderAll();
            saveState();
        }
    }

    function getFilter(index) {
        const obj = canvas.getActiveObject();
        return obj ? obj.filters[index] : null;
    }
    
    filterControls.addEventListener('change', (e) => {
        const targetId = e.target.id;
        const obj = canvas.getActiveObject();
        if (!obj) return;

        switch (targetId) {
            case 'grayscale-filter':
                applyFilter(0, e.target.checked ? new fabric.Image.filters.Grayscale() : null);
                break;
            case 'sepia-filter':
                applyFilter(1, e.target.checked ? new fabric.Image.filters.Sepia() : null);
                break;
            case 'blur-filter':
                applyFilter(2, new fabric.Image.filters.Blur({ blur: parseFloat(e.target.value) }));
                break;
            case 'brightness-filter':
                applyFilter(3, new fabric.Image.filters.Brightness({ brightness: parseFloat(e.target.value) }));
                break;
            case 'contrast-filter':
                applyFilter(4, new fabric.Image.filters.Contrast({ contrast: parseFloat(e.target.value) }));
                break;
            case 'saturation-filter':
                applyFilter(5, new fabric.Image.filters.Saturation({ saturation: parseFloat(e.target.value) }));
                break;
        }
    });

    document.getElementById('reset-filters-btn').addEventListener('click', () => {
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.filters = [];
            obj.applyFilters();
            canvas.renderAll();
            saveState();
            // uncheck all checkboxes and reset ranges
            filterControls.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
            filterControls.querySelectorAll('input[type="range"]').forEach(input => input.value = 0);
        }
    });

    function saveState(doNotSave) {
        if (!doNotSave) {
            history = history.slice(0, historyIndex + 1);
            const json = JSON.stringify(canvas);
            history.push(json);
            historyIndex++;
            localStorage.setItem('collageState', json);
        }
        updateUndoRedoButtons();
    }

    function loadState(state) {
        canvas.loadFromJSON(state, () => {
            canvas.renderAll();
        });
    }

    function restoreState() {
        const savedState = localStorage.getItem('collageState');
        if (savedState) {
            loadState(savedState);
            history = [savedState];
            historyIndex = 0;
            updateUndoRedoButtons();
        }
    }

    function updateUndoRedoButtons() {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= history.length - 1;
    }

    function setCanvasSize(ratio) {
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.offsetWidth - 40;
        const containerHeight = container.offsetHeight - 40;
        let width, height;

        if (ratio === 'custom') {
            // For custom, we can have a default or prompt user
            width = 500;
            height = 500;
        } else {
            const [ratioW, ratioH] = ratio.split(':').map(Number);
            if (containerWidth / containerHeight > ratioW / ratioH) {
                height = containerHeight;
                width = height * (ratioW / ratioH);
            } else {
                width = containerWidth;
                height = width * (ratioH / ratioW);
            }
        }
        canvas.setWidth(width);
        canvas.setHeight(height);
        canvas.renderAll();
        saveState();
    }

    const customSizeInputs = document.getElementById('custom-size-inputs');
    const customWidthInput = document.getElementById('custom-width');
    const customHeightInput = document.getElementById('custom-height');
    const applyCustomSizeBtn = document.getElementById('apply-custom-size');

    templateSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customSizeInputs.style.display = 'flex';
        } else {
            customSizeInputs.style.display = 'none';
            setCanvasSize(e.target.value);
        }
    });

    applyCustomSizeBtn.addEventListener('click', () => {
        const width = parseInt(customWidthInput.value, 10);
        const height = parseInt(customHeightInput.value, 10);
        if (width > 0 && height > 0) {
            canvas.setWidth(width);
            canvas.setHeight(height);
            canvas.renderAll();
            saveState();
        }
    });

    bgColorInput.addEventListener('input', (e) => {
        canvas.setBackgroundColor(e.target.value, canvas.renderAll.bind(canvas));
        saveState();
    });

    imageUpload.addEventListener('change', (e) => {
        for (const file of e.target.files) {
            const reader = new FileReader();
            reader.onload = (f) => {
                fabric.Image.fromURL(f.target.result, (img) => {
                    img.scaleToWidth(canvas.width / 4);
                    canvas.add(img);
                    saveState();
                });
            };
            reader.readAsDataURL(file);
        }
    });

    canvas.wrapperEl.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    canvas.wrapperEl.addEventListener('drop', (e) => {
        e.preventDefault();
        for (const file of e.dataTransfer.files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (f) => {
                    fabric.Image.fromURL(f.target.result, (img) => {
                        img.set({
                            left: e.layerX - img.getScaledWidth() / 2,
                            top: e.layerY - img.getScaledHeight() / 2,
                        });
                        img.scaleToWidth(canvas.width / 4);
                        canvas.add(img);
                        saveState();
                    });
                };
                reader.readAsDataURL(file);
            }
        }
    });

    undoBtn.addEventListener('click', () => {
        if (historyIndex > 0) {
            historyIndex--;
            loadState(history[historyIndex]);
            updateUndoRedoButtons();
        }
    });

    redoBtn.addEventListener('click', () => {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            loadState(history[historyIndex]);
            updateUndoRedoButtons();
        }
    });

    exportPngBtn.addEventListener('click', () => {
        const dataURL = canvas.toDataURL({ format: 'png' });
        const link = document.createElement('a');
        link.download = 'collage.png';
        link.href = dataURL;
        link.click();
    });

    exportJpegBtn.addEventListener('click', () => {
        const dataURL = canvas.toDataURL({ format: 'jpeg' });
        const link = document.createElement('a');
        link.download = 'collage.jpeg';
        link.href = dataURL;
        link.click();
    });

    copyBtn.addEventListener('click', () => {
        canvas.toBlob((blob) => {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                .then(() => alert('Image copied to clipboard!'))
                .catch(err => console.error('Could not copy image: ', err));
        });
    });
    
    canvas.on('object:modified', saveState);
    canvas.on('object:added', saveState);
    canvas.on('object:removed', saveState);

    function updateLayers() {
        layersPanel.innerHTML = '';
        canvas.getObjects().forEach((obj, index) => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            layerItem.dataset.index = index;
            layerItem.draggable = true;
            layerItem.innerHTML = `
                <span>Image ${index + 1}</span>
                <div>
                    <button class="layer-up">&uarr;</button>
                    <button class="layer-down">&darr;</button>
                    <button class="layer-delete">&times;</button>
                </div>
            `;
            layersPanel.appendChild(layerItem);
        });
    }

    layersPanel.addEventListener('click', (e) => {
        const target = e.target;
        const layerItem = target.closest('.layer-item');
        if (!layerItem) return;

        const index = parseInt(layerItem.dataset.index, 10);
        const obj = canvas.getObjects()[index];

        if (target.classList.contains('layer-up')) {
            canvas.bringForward(obj);
        } else if (target.classList.contains('layer-down')) {
            canvas.sendBackwards(obj);
        } else if (target.classList.contains('layer-delete')) {
            canvas.remove(obj);
        }
        updateLayers();
        saveState();
    });

    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);
    canvas.on('object:modified', updateLayers);

    const textControls = document.getElementById('text-controls');
    const addTextBtn = document.getElementById('add-text-btn');
    const textInput = document.getElementById('text-input');
    const fontFamilySelect = document.getElementById('font-family-select');
    const textColorInput = document.getElementById('text-color-input');

    addTextBtn.addEventListener('click', () => {
        const text = new fabric.IText(textInput.value || 'Hello', {
            left: 50,
            top: 50,
            fontFamily: fontFamilySelect.value,
            fill: textColorInput.value
        });
        canvas.add(text);
        saveState();
    });

    // Initial setup
    setCanvasSize(templateSelect.value);
    updateLayers();
    restoreState();
});

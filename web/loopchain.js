import { app } from '/scripts/app.js'
import { api } from '/scripts/api.js'
import * as shared from './comfy_shared.js'

//https://github.com/melMass/comfy_mtb/blob/main/web/mtb_widgets.js#L309
//Thanks for cool text box.
const DEBUG_STRING = (name, val) => {
    const fontSize = 16
    const w = {
        name,
        type: 'debug_text',

        draw: function (ctx, node, widgetWidth, widgetY, height) {
            // const [cw, ch] = this.computeSize(widgetWidth)
            shared.offsetDOMWidget(this, ctx, node, widgetWidth, widgetY, height)
        },
        computeSize: function (width) {
            const value = this.inputEl.innerHTML
            if (!value) {
                return [32, 32]
            }
            if (!width) {
                log(`No width ${this.parent.size}`)
            }

            const oldFont = app.ctx.font
            app.ctx.font = `${fontSize}px monospace`

            const words = value.split(' ')
            const lines = []
            let currentLine = ''
            for (const word of words) {
                const testLine =
                    currentLine.length === 0 ? word : `${currentLine} ${word}`

                const testWidth = app.ctx.measureText(testLine).width

                if (testWidth > width) {
                    lines.push(currentLine)
                    currentLine = word
                } else {
                    currentLine = testLine
                }
            }
            app.ctx.font = oldFont
            if (lines.length === 0) lines.push(currentLine)

            const textHeight = (lines.length + 1) * fontSize

            const maxLineWidth = lines.reduce(
                (maxWidth, line) =>
                    Math.max(maxWidth, app.ctx.measureText(line).width),
                0
            )
            const widgetWidth = Math.max(width || this.width || 32, maxLineWidth)
            const widgetHeight = textHeight * 1.5
            return [widgetWidth, widgetHeight]
        },
        onRemoved: function () {
            if (this.inputEl) {
                this.inputEl.remove()
            }
        },
    }

    Object.defineProperty(w, 'value', {
        get() {
            return this.inputEl.innerHTML
        },
        set(value) {
            this.inputEl.innerHTML = value
            this.parent?.setSize?.(this.parent?.computeSize())
        },
    })

    w.inputEl = document.createElement('p')
    w.inputEl.style.textAlign = 'center'
    w.inputEl.style.fontSize = `${fontSize}px`
    w.inputEl.style.color = 'var(--input-text)'
    w.inputEl.style.lineHeight = 0

    w.inputEl.style.fontFamily = 'monospace'
    w.value = val
    document.body.appendChild(w.inputEl)

    return w
}

const getNodeByLink = (linkId, type) => app.graph.getNodeById(app.graph.links[linkId][type == "input" ? "origin_id" : "target_id"]);
function enableOnlyRelatedNodes(targetNode) {
    let whitelist = {};

    function travelBackward(node) {
        whitelist[node.id] = node;
        if (!node.inputs) return;
        for (const input of node.inputs) {
            if (!input.link) continue
            travelBackward(getNodeByLink(input.link, "input"));
        }
    }

    function travelForward(node) {
        whitelist[node.id] = node;
        travelBackward(node);
        if (!node.outputs) return;
        for (const output of node.outputs) {
            if (!output.links) continue;
            for (const link of output.links) {
                travelForward(getNodeByLink(link, "output"));
            }
        }
    }

    travelForward(targetNode);

    let notAlreadyMutedBlacklist = app.graph._nodes.filter(node => node.mode !== 2 && !whitelist[node.id]);
    for (const node of notAlreadyMutedBlacklist) node.mode = 2;
    return notAlreadyMutedBlacklist;
}

const findWidgetByName = (node, widgetName) => node.widgets.find(w => w.name === widgetName)

const MOD_METHODS = {
    EmptyLatentImageLoop: {
        beforeDef(nodeType, nodeData, app) {
            nodeType.prototype.onNodeCreated = function () {
                const numLoop = findWidgetByName(this, 'num_loop');
                const loopIndex = findWidgetByName(this, 'loop_idx');
                loopIndex.afterQueued = function () {
                    this.value++;
                }
                const loopPreview = this.addCustomWidget(
                    DEBUG_STRING('loop_preview', 'Iteration: Idle')
                );
                loopPreview.parent = this
                loopIndex.afterQueued = function () {
                    loopPreview.value = this.value == numLoop.value - 1
                        ? 'Done 😎!'
                        : `current loop: ${this.value + 1}/${numLoop.value}`;
                    this.value++;
                }
            }
        },
        whenCreated(node, app) {
            node.addWidget('button', `Queue`, 'queue', function () {
                const numLoop = findWidgetByName(node, 'num_loop');
                const loopIndex = findWidgetByName(node, 'loop_idx');
                shared.hideWidgetForGood(node, loopIndex);
                loopIndex.value = 0;
                enableOnlyRelatedNodes(node);
                app.queuePrompt(0, numLoop.value);
            });
        }
    },
    ImageStorageExportLoop: {
        beforeDef(nodeType, nodeData, app) {
            nodeType.prototype.onNodeCreated = function () {
                this.changeMode(LiteGraph.ALWAYS);
                const loopIndex = findWidgetByName(this, 'loop_idx');
                const numLoop = findWidgetByName(this, 'num_loop');
                const loopPreview = this.addCustomWidget(
                    DEBUG_STRING('loop_preview', 'Iteration: Idle')
                );
                loopPreview.parent = this
                loopIndex.afterQueued = function () {
                    loopPreview.value = this.value == numLoop.value - 1
                        ? 'Done 😎!'
                        : `current loop: ${this.value + 1}/${numLoop.value}`;
                    this.value++;
                }

                this.onRemoved = () => {
                    for (const w of this.widgets) {
                        if (w.canvas) {
                            w.canvas.remove()
                        }
                        w.onRemoved?.()
                    }
                    app.canvas.setDirty(true)
                }
            }
        },
        whenCreated(node, app) {
            const numLoop = findWidgetByName(node, 'num_loop');
            shared.hideWidgetForGood(node, numLoop);
            const loopIndex = findWidgetByName(node, 'loop_idx');
            shared.hideWidgetForGood(node, loopIndex);
            loopIndex.value = 0;
            const loopPreview = findWidgetByName(node, 'loop_preview');

            node.addWidget('button', `Queue`, 'queue', function () {
                //LiteGraph dunno async function lol
                app.canvas.setDirty(true);
                const key = findWidgetByName(node, 'key').value;
                const batchSize = findWidgetByName(node, 'batch_size').value;
                loopIndex.value = 0;

                fetch(`/loopchain/dataloader_length?type=image&key=${key}&batch_size=${batchSize}`)
                    .then(re => re.json())
                    .then(async ({ result }) => {
                        if (result == -1) {
                            loopPreview.value = `${key} not found 🤔.`;
                            return;
                        }
                        numLoop.value = result;
                        const notAlreadyMutedBlacklist = enableOnlyRelatedNodes(node);
                        await app.queuePrompt(0, numLoop.value);
                        for (const node of notAlreadyMutedBlacklist) {
                            node.mode = 0;
                        }
                    });
            });
        }
    }
}

app.registerExtension({
    name: "loopchain",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (MOD_METHODS[nodeData.name]) MOD_METHODS[nodeData.name].beforeDef(nodeType, nodeData, app)
    },
    nodeCreated(node, app) {
        if (MOD_METHODS[node.comfyClass]) MOD_METHODS[node.comfyClass].whenCreated(node, app)
    }
})
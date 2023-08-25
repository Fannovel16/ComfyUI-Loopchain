import { DEBUG_STRING, getNodeByLink, enableOnlyRelatedNodes, findWidgetByName, waitForWSEvent } from "../utils.js"
import * as shared from '../comfy_shared.js'


export const ImageStorageExportLoop = {
    beforeDef(nodeType, nodeData, app) {
        nodeType.prototype.onNodeCreated = function () {
            this.changeMode(LiteGraph.ALWAYS);
            const loopPreview = this.addCustomWidget(
                DEBUG_STRING('loop_preview', 'Iteration: Idle')
            );
            loopPreview.parent = this;

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
        const queueBtn = node.addWidget('button', `Queue`, 'queue', function () {
            const loopIndex = findWidgetByName(node, 'loop_idx');
            loopIndex.value = 0;
            return (async _ => {
                const key = findWidgetByName(node, "key");
                const batchSize = findWidgetByName(node, "batch_size");
                const loopPreview = findWidgetByName(node, 'loop_preview');
                

                const { result: numLoop } = await fetch(`/loopchain/dataloader_length?type=image&key=${key.value}&batch_size=${batchSize.value}`)
                    .then(re => re.json())
                if (numLoop === -1) {
                    loopPreview.value = `"${key.value}" not found. 🤔`
                    return;
                }
                
                for (let i = 0; i < numLoop; i++) {
                    const notAlreadyMutedBlacklist = enableOnlyRelatedNodes(node);
                    await app.queuePrompt(0);
                    for (const node of notAlreadyMutedBlacklist) node.mode = 0;
                    const promptId = await waitForWSEvent(({ data }) => {
                        if (data instanceof ArrayBuffer) return false;
                        const msg = JSON.parse(data);
                        if (msg.type === "execution_start") return msg.data.prompt_id;
                        return false;
                    });
                    await waitForWSEvent(({ data }) => {
                        if (data instanceof ArrayBuffer) return false;
                        const msg = JSON.parse(data);
                        if (msg.type === "executing" && msg.data.prompt_id === promptId && msg.data.node === null) return true;
                        return false;
                    });
                    loopPreview.value = `current loop: ${i + 1}/${numLoop}`;
                    loopIndex.value++;
                }
                loopPreview.value = 'Done 😎!';
            })();

        });
        let isShowed = true;
        setInterval(_ => {
            if (node.inputs[0].link && isShowed) {
                shared.hideWidgetForGood(node, queueBtn);
                isShowed = false;
            }
            if (!node.inputs[0].link && !isShowed) {
                shared.showWidget(queueBtn);
                isShowed = true;
            }
        }, 0)
    }
}
export const ImageStorageReset = {
    whenCreated(node, app) {
        node.addWidget('button', `Queue`, 'queue', function () {
            const notAlreadyMutedBlacklist = enableOnlyRelatedNodes(node);
            app.queuePrompt(0)
                .then(_ => notAlreadyMutedBlacklist.forEach(node => node.mode = 0));
        });
    }
}
export const LatentStorageReset = {
    whenCreated(node, app) {
        node.addWidget('button', `Queue`, 'queue', function () {
            const notAlreadyMutedBlacklist = enableOnlyRelatedNodes(node);
            app.queuePrompt(0)
                .then(_ => notAlreadyMutedBlacklist.forEach(node => node.mode = 0));
        });
    }
}
export const FolderToImageStorage = {
    whenCreated(node, app) {
        node.addWidget('button', `Queue`, 'queue', function () {
            const notAlreadyMutedBlacklist = enableOnlyRelatedNodes(node);
            app.queuePrompt(0)
                .then(_ => notAlreadyMutedBlacklist.forEach(node => node.mode = 0));
        });
    }
}
import { DEBUG_STRING, getNodeByLink, enableOnlyRelatedNodes, findWidgetByName, waitForWSEvent } from "../utils.js"
import * as shared from '../comfy_shared.js'

export const EmptyLatentImageLoop = {
    beforeDef(nodeType, nodeData, app) {
        nodeType.prototype.onNodeCreated = function () {
            const loopIndex = findWidgetByName(this, 'loop_idx');
            loopIndex.value = 0;
            shared.hideWidgetForGood(node, loopIndex);

            const loopPreview = this.addCustomWidget(
                DEBUG_STRING('loop_preview', 'Iteration: Idle')
            );
            loopPreview.parent = this;
        }
    },
    whenCreated(node, app) {
        node.addWidget('button', `Queue`, 'queue', function () {
            return (async _ => {
                const numLoop = findWidgetByName(node, 'num_loop');
                const loopPreview = findWidgetByName(node, 'loop_preview');
                const loopIndex = findWidgetByName(this, 'loop_idx');
                loopIndex.value = 0;
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
                    loopPreview.value = `current loop: ${i + 1}/${numLoop.value}`;
                    await new Promise(re => setTimeout(re, 1000));
                    loopIndex.value++;
                }
                loopPreview.value = 'Done 😎!';
                loopIndex.value = 0;
            })();

        });
    }
}
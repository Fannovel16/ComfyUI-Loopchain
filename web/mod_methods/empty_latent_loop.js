import { DEBUG_STRING, getNodeByLink, enableOnlyRelatedNodes, findWidgetByName, executeAndWaitForLoopchain } from "../utils.js"
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
                    await executeAndWaitForLoopchain(app, node);
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
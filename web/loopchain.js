import { app } from '/scripts/app.js'
import { api } from '/scripts/api.js'
import * as shared from './comfy_shared.js'

const getNodeByLink = (linkId, type) => app.graph.getNodeById(app.graph.links[linkId][type == "input" ? "origin_id" : "target_id"]);
function enableOnlyRelatedNodes(targetNode) {
    let whitelist = {};

    function travelBackward(node) {
        whitelist[node.id] = node;
        if (!node.inputs) return;
        for (const input of node.inputs) {
            travelBackward(
                getNodeByLink(input.link, "input"),
                whitelist
            );
        }
    }

    function travelForward(node) {
        whitelist[node.id] = node;
        travelBackward(node);
        if (!node.outputs) return;
        for (const output of node.outputs) {
            if (!output.links) continue
            
            for (const link of output.links) {
                travelForward(
                    getNodeByLink(link, "output"),
                    whitelist
                );
            }
        }
    }

    travelForward(targetNode);

    for (const node of app.graph._nodes) {
        if (!whitelist[node.id]) node.mode = 2;
    }
}

const MOD_METHODS = {
    EmptyLatentImageLoop: {
        beforeDef (nodeType, nodeData, app) {
            nodeType.prototype.onNodeCreated = function () {
                const numLoop = this.widgets.find((w) => w.name === 'num_loop');
                const loopIndex = this.widgets.find((w) => w.name === 'loop_idx');
                
                this.afterQueued = function () {
                    loopIndex.value++;
                }
            }
        },
        whenCreated (node, app) {
            node.addWidget('button', `Queue`, 'queue', function() {
                const numLoop = node.widgets.find((w) => w.name === 'num_loop');
                const loopIndex = node.widgets.find((w) => w.name === 'loop_idx');

                loopIndex.value = 0;
                enableOnlyRelatedNodes(node);
                app.queuePrompt(0, numLoop.value);
            });
        }
    }
}

app.registerExtension({
    name: "loopchain",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (MOD_METHODS[nodeData.name]) MOD_METHODS[nodeData.name].beforeDef(nodeType, nodeData, app)
	},
    async addCustomNodeDefs(defs, app) {
	},
    nodeCreated(node, app) {
        if (MOD_METHODS[node.comfyClass]) MOD_METHODS[node.comfyClass].whenCreated(node, app)
    }
})
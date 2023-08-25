import { app } from '/scripts/app.js'
import { ComfyWidgets } from "/scripts/widgets.js"
import { DEBUG_STRING, getNodeByLink, enableOnlyRelatedNodes, findWidgetByName } from "./utils.js"
import * as empty_latent_loop from "./mod_methods/empty_latent_loop.js"
import * as storages from "./mod_methods/storages.js"

const MOD_METHODS = {
    ...empty_latent_loop,
    ...storages
}

class LoopchainPipeline {
    constructor() {
        const pipeline = this;
        pipeline.isVirtualNode = true;
        pipeline.serialize_widgets = true;

        const { widget: slots } = ComfyWidgets.INT(pipeline, "slots", [null, { display: "number" }], app);

        slots.callback = function (v) {
            const s = this.options.step / 10;
            this.value = Math.round(v / s) * s;
            const outputNum = pipeline.outputs?.length || 0;

            if (this.value < outputNum) {
                for (let i = outputNum; i > this.value; i--) pipeline.removeOutput(i - 1);
                return;
            }

            for (let i = outputNum; i < this.value; i++) {
                pipeline.addOutput(`pipeline_${i + 1}`, "LOOPCHAIN_PIPELINE");
            }
        }
        pipeline.addWidget('button', `Queue`, 'queue', function () {
            return (async _ => {
                const sortedOutputs = pipeline.outputs.sort((a, b) => a.name.localeCompare(b.name));
                for (const output of sortedOutputs) {
                    if (!output.links?.[0]) continue;
                    const loopNode = getNodeByLink(output.links[0], "output");
                    await findWidgetByName(loopNode, "Queue").callback();
                }
            })();
        });

    }
}

app.registerExtension({
    name: "loopchain",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        MOD_METHODS[nodeData.name]?.beforeDef?.(nodeType, nodeData, app)
    },
    async registerCustomNodes(app) {
        LiteGraph.registerNodeType(
            "LoopchainPipeline",
            Object.assign(LoopchainPipeline, {
                title: "Loopchain Pipeline",
            })
        );

        LoopchainPipeline.category = "Loopchain";
    },
    nodeCreated(node, app) {
        MOD_METHODS[node.comfyClass]?.whenCreated?.(node, app)
    }
})
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
		if (!node.outputs) return;
		for (const output of node.outputs) {
			for (const link of output.links) {
				travelForward(
					getNodeByLink(link, "output"),
					whitelist
				);
			}
		}
	}

	travelBackward(targetNode), travelForward(targetNode);

	for (const node of app.graph._nodes) {
		if (!whitelist[node.id]) node.mode = 2;
	}
}

function modEmptyLatent(nodeType, nodeData, app) {
	nodeType.prototype.onNodeCreated = function () {
		const numLoop = this.widgets.find((w) => w.name === 'num_loop');
		const loopIndex = this.widgets.find((w) => w.name === 'loop_idx');
		const runButton = this.addWidget('button', `Queue`, 'queue', () => {
			loopIndex.value = 0;
			enableOnlyRelatedNodes(nodeData);
			app.queuePrompt(0, numLoop.value);
		});
	
		this.afterQueued = function () {
			loopIndex.value++;
		}
	}
	
}

app.registerExtension({
	name: "loopchain",

	async beforeRegisterNodeDef(nodeType, nodeData, app) {
		switch (nodeData.name) {
			case "EmptyLatentImageLoop":
				modEmptyLatent(nodeType, nodeData, app);
				break;
			default:
				break;
		}
	}
})
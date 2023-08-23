/**
 * File: mtb_widgets.js
 * Project: comfy_mtb
 * Author: Mel Massadian
 *
 * Copyright (c) 2023 Mel Massadian
 *
 */

import { app } from '/scripts/app.js'
import { api } from '/scripts/api.js'
import * as shared from '/extensions/mtb/comfy_shared.js'

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

async function modEmptyLatent(self, nodeType, nodeData, app) {
	const numLoop = self.widgets.find((w) => w.name === 'num_loop');
	const loopIndex = self.widgets.find((w) => w.name === 'loop_idx');
	const runButton = self.addWidget('button', `Queue`, 'queue', () => {
		loopIndex.value = 0;
		enableOnlyRelatedNodes(nodeData);
		app.queuePrompt(0, numLoop.value);
	});

	self.afterQueued = function () {
		loopIndex.value++;
	}
}

app.registerExtension({
	async beforeRegisterNodeDef(nodeType, nodeData, app) {
		switch (nodeData.name) {
			case "EmptyLatentImageLoop":
				modEmptyLatent(this, nodeType, nodeData, app);
				break;
			default:
				break;
		}
	}
})
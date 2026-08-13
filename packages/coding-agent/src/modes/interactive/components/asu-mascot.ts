import * as fs from "node:fs";
import { Container, getCapabilities, Image, Text } from "@earendil-works/pi-tui";
import { getBundledInteractiveAssetPath } from "../../../config.ts";
import { theme } from "../theme/theme.ts";

const IMAGE_FILENAME = "asu-pixel.png";
const ANSI_FALLBACK_FILENAME = "asu-pixel.ansi";
const MAX_WIDTH_CELLS = 14;

let cachedImageBase64: string | undefined;
let attemptedImageLoad = false;

function loadImageBase64(): string | undefined {
	if (attemptedImageLoad) return cachedImageBase64;

	attemptedImageLoad = true;
	try {
		cachedImageBase64 = fs.readFileSync(getBundledInteractiveAssetPath(IMAGE_FILENAME)).toString("base64");
	} catch {
		cachedImageBase64 = undefined;
	}
	return cachedImageBase64;
}

function loadAnsiFallback(): string | undefined {
	try {
		return fs.readFileSync(getBundledInteractiveAssetPath(ANSI_FALLBACK_FILENAME), "utf-8").trimEnd();
	} catch {
		return undefined;
	}
}

/** Small ASu pixel mascot shown below the interactive startup header. */
export class AsuMascotComponent extends Container {
	constructor() {
		super();
		if (!getCapabilities().images) {
			const ansiFallback = loadAnsiFallback();
			if (ansiFallback) this.addChild(new Text(ansiFallback, 1, 0));
			return;
		}

		const imageBase64 = loadImageBase64();
		if (!imageBase64) return;

		this.addChild(
			new Image(
				imageBase64,
				"image/png",
				{ fallbackColor: (text) => theme.fg("muted", text) },
				{ maxWidthCells: MAX_WIDTH_CELLS, filename: IMAGE_FILENAME },
			),
		);
	}
}

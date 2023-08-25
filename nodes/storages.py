import torch
from torch.utils.data import DataLoader
from server import PromptServer
from aiohttp import web
import random
from PIL import Image, ImageOps
from PIL.PngImagePlugin import PngInfo
import numpy as np
import folder_paths
from torch.utils.data import DataLoader
import os

GLOBAL_IMAGE_STORAGE = {}
GLOBAL_LATENT_STORAGE = {}

class ImageStorageImport:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": { "key": ("STRING", {"multiline": False}), "image": ("IMAGE", ) } 
        }

    CATEGORY = "Loopchain/storage"
    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "execute"

    def execute(self, key, image):
        if key not in GLOBAL_IMAGE_STORAGE:
            GLOBAL_IMAGE_STORAGE[key] = []
        GLOBAL_IMAGE_STORAGE[key].append(image)
        return {}
    
    @classmethod
    def IS_CHANGED():
        return float("nan")

class ImageStorageExportLoop:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "key": ("STRING", {"multiline": False}), 
                "batch_size": ("INT", {"default": 1, "min": 1}),
                "loop_idx": ("INT", {"default": 0, "min": 0}),
            },
            "optional": {
                "opt_pipeline": ("LOOPCHAIN_PIPELINE", )
            }
        }

    CATEGORY = "Loopchain/storage"
    FUNCTION = "execute"
    RETURN_TYPES = ("IMAGE", "INT", "INT")
    RETURN_NAMES = ("IMAGE", "LOOP IDX (INT)", "IDX_IN_BATCH (INT)")

    def execute(self, key, batch_size, loop_idx, opt_pipeline=None):
        key = key.strip()
        assert GLOBAL_IMAGE_STORAGE[key], f"Image storage {key} doesn't exist."
        dataloader = DataLoader(torch.cat(GLOBAL_IMAGE_STORAGE[key], dim=0), batch_size=batch_size)
        return (list(dataloader)[loop_idx], loop_idx, loop_idx % batch_size)
    
    @classmethod
    def IS_CHANGED():
        return float("nan")

class ImageStorageReset:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": { "key_list": ("STRING", {"multiline": True, "default": '*'}) },
            "optional": {
                "pipeline": ("LOOPCHAIN_PIPELINE", )
            }
        }

    CATEGORY = "Loopchain/storage"
    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "execute"

    def execute(self, key_list):
        keys = GLOBAL_IMAGE_STORAGE.keys() if key_list.strip() == '*' else ','.split(key_list)
        keys = list(map(lambda key: key.strip(), keys))
        for key in keys:
            if key in GLOBAL_IMAGE_STORAGE:
                del GLOBAL_IMAGE_STORAGE[key.strip()]
        return {}

    @classmethod
    def IS_CHANGED():
        return float("nan")



IMAGE_EXTENSIONS = ('.ras', '.xwd', '.bmp', '.jpe', '.jpg', '.jpeg', '.xpm', '.ief', '.pbm', '.tif', '.gif', '.ppm', '.xbm', '.tiff', '.rgb', '.pgm', '.png', '.pnm', 'webp')

class FolderToImageStorage:
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        folders = [f for f in os.listdir(input_dir) if not os.path.isfile(os.path.join(input_dir, f))]
        return {
            "required": {
                "key": ("STRING", {"multiline": False}),
                "folder": (sorted(folders), )
            },
            "optional": {
                "pipeline": ("LOOPCHAIN_PIPELINE", )
            }
        }

    CATEGORY = "Loopchain/storage"
    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "load_image"

    def load_image(self, key, folder):
        key = key.strip()
        folder = os.path.join(folder_paths.get_input_directory(), folder)
        images = filter(lambda f: os.path.splitext(f)[1] in IMAGE_EXTENSIONS, os.listdir(folder))
        images = sorted(list(images))

        assert len(images), "No image is found in folder {folder}"

        GLOBAL_IMAGE_STORAGE[key] = []

        for image_name in images:
            i = Image.open(os.path.join(folder_paths.get_input_directory(), folder, image_name))
            i = ImageOps.exif_transpose(i)
            image = i.convert("RGB")
            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]
            if 'A' in i.getbands():
                mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
                mask = 1. - torch.from_numpy(mask)
            else:
                mask = torch.zeros((64,64), dtype=torch.float32, device="cpu")
            
            GLOBAL_IMAGE_STORAGE[key].append(image)
        
        return {}











class LatentStorageImport:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": { "key": ("STRING", {"multiline": False}), "latent": ("LATENT", ) } 
        }

    CATEGORY = "Loopchain/storage"
    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "execute"

    def execute(self, key, latent):
        key = key.strip()
        if key not in GLOBAL_LATENT_STORAGE:
            GLOBAL_LATENT_STORAGE[key] = []
        GLOBAL_LATENT_STORAGE[key].append(latent)
        return {}
    
    @classmethod
    def IS_CHANGED():
        return float("nan")

class LatentStorageExportLoop:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": { 
                "key": ("STRING", {"multiline": False}), 
                "batch_size": ("INT", {"default": 1, "min": 1}),
                "loop_idx": ("INT", {"default": 0, "min": 0})
            },
            "optional": {
                "opt_pipeline": ("LOOPCHAIN_PIPELINE", )
            }
        }

    CATEGORY = "Loopchain/storage"
    FUNCTION = "execute"
    RETURN_TYPES = ("LATENT", "INT", "INT")
    RETURN_NAMES = ("LATENT", "LOOP IDX (INT)", "IDX_IN_BATCH (INT)")

    def execute(self, key, batch_size, loop_idx, opt_pipeline=None):
        key = key.strip()
        assert GLOBAL_LATENT_STORAGE[key], f"Latent storage {key} doesn't exist."
        dataloader = DataLoader(torch.cat(GLOBAL_LATENT_STORAGE[key], dim=0), batch_size=batch_size)
        return (list(dataloader)[loop_idx], loop_idx, loop_idx % batch_size)
    
    @classmethod
    def IS_CHANGED():
        return float("nan")

class LatentStorageReset:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": { "key_list": ("STRING", {"multiline": True, "default": '*'}) },
            "optional": {
                "pipeline": ("LOOPCHAIN_PIPELINE", )
            }
        }

    CATEGORY = "Loopchain/storage"
    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "execute"

    def execute(self, key_list):
        key = key.strip()
        keys = GLOBAL_LATENT_STORAGE.keys() if key_list.strip() == '*' else ','.split(key_list)
        keys = list(map(lambda key: key.strip(), keys))
        for key in keys:
            if key in GLOBAL_LATENT_STORAGE:
                del GLOBAL_LATENT_STORAGE[key.strip()]
        return {}

    @classmethod
    def IS_CHANGED():
        return float("nan")


NODE_CLASS_MAPPINGS = {
    "ImageStorageImport": ImageStorageImport,
    "ImageStorageExportLoop": ImageStorageExportLoop,
    "ImageStorageReset": ImageStorageReset,
    "FolderToImageStorage": FolderToImageStorage,
    "LatentStorageImport": LatentStorageImport,
    "LatentStorageExportLoop": LatentStorageExportLoop,
    "LatentStorageReset": LatentStorageReset
}

@PromptServer.instance.routes.get("/loopchain/dataloader_length")
async def get_storage_length(request):
    storage_type = request.query["type"]
    storage_key = request.query["key"].strip()
    batch_size = int(request.query["batch_size"])

    storage =  GLOBAL_IMAGE_STORAGE if storage_type == "image" else GLOBAL_LATENT_STORAGE
    if not storage_key in storage:
        return web.json_response({
            "result": -1
        })

    dataloader = DataLoader(torch.cat(storage[storage_key], dim=0), batch_size=batch_size)
    return web.json_response({
        "result": len(dataloader)
    })
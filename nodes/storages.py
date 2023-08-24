import torch
from torch.utils.data import DataLoader
from server import PromptServer
from aiohttp import web
import random

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
        return ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for _ in range(10))

class ImageStorageExport:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": { "key": ("STRING", {"multiline": False}) } 
        }

    CATEGORY = "Loopchain/storage"
    FUNCTION = "execute"
    RETURN_TYPES = ("IMAGE",)

    def execute(self, key):
        assert GLOBAL_IMAGE_STORAGE[key], f"Image storage {key} doesn't exist."
        return (torch.cat(GLOBAL_IMAGE_STORAGE[key], dim=0), )
    
    @classmethod
    def IS_CHANGED():
        return ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for _ in range(10))

class ImageStorageExportLoop:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "key": ("STRING", {"multiline": False}), 
                "batch_size": ("INT", {"default": 1, "min": 1}),
                "loop_idx": ("INT", {"default": 0, "min": 0}),
                "num_loop": ("INT", {"default": 1, "min": 1}),
            },
            "optional": {
                "opt_pipeline": ("LOOPCHAIN_PIPELINE", )
            }
        }

    CATEGORY = "Loopchain/storage"
    FUNCTION = "execute"
    RETURN_TYPES = ("IMAGE", "INT", "INT")
    RETURN_NAMES = ("IMAGE", "LOOP IDX (INT)", "IDX_IN_BATCH (INT)")

    def execute(self, key, batch_size, loop_idx, num_loop, opt_pipeline=None):
        assert GLOBAL_IMAGE_STORAGE[key], f"Image storage {key} doesn't exist."
        dataloader = DataLoader(torch.cat(GLOBAL_IMAGE_STORAGE[key], dim=0), batch_size=batch_size)
        return (list(dataloader)[loop_idx], loop_idx, loop_idx % batch_size)
    
    @classmethod
    def IS_CHANGED():
        return ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for _ in range(10))

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
        return ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for _ in range(10))

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
        if key not in GLOBAL_LATENT_STORAGE:
            GLOBAL_LATENT_STORAGE[key] = []
        GLOBAL_LATENT_STORAGE[key].append(latent)
        return {}
    
    @classmethod
    def IS_CHANGED():
        return ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for _ in range(10))

class LatentStorageExport:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": { "key": ("STRING", {"multiline": False}) } 
        }

    CATEGORY = "Loopchain/storage"
    FUNCTION = "execute"
    RETURN_TYPES = ("LATENT",)

    def execute(self, key):
        assert GLOBAL_LATENT_STORAGE[key], f"Latent storage {key} doesn't exist."
        return (torch.cat(GLOBAL_LATENT_STORAGE[key], dim=0), )
    
    @classmethod
    def IS_CHANGED():
        return ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for _ in range(10))

class LatentStorageExportLoop:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": { 
                "key": ("STRING", {"multiline": False}), 
                "batch_size": ("INT", {"default": 1, "min": 1}),
                "loop_idx": ("INT", {"default": 0, "min": 0}),
                "num_loop": ("INT", {"default": 1, "min": 1})
            },
            "optional": {
                "opt_pipeline": ("LOOPCHAIN_PIPELINE", )
            }
        }

    CATEGORY = "Loopchain/storage"
    FUNCTION = "execute"
    RETURN_TYPES = ("LATENT", "INT", "INT")
    RETURN_NAMES = ("LATENT", "LOOP IDX (INT)", "IDX_IN_BATCH (INT)")

    def execute(self, key, batch_size, loop_idx, num_loop, opt_pipeline=None):
        assert GLOBAL_LATENT_STORAGE[key], f"Latent storage {key} doesn't exist."
        dataloader = DataLoader(torch.cat(GLOBAL_LATENT_STORAGE[key], dim=0), batch_size=batch_size)
        return (list(dataloader)[loop_idx], loop_idx, loop_idx % batch_size)
    
    @classmethod
    def IS_CHANGED():
        return ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for _ in range(10))

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
        keys = GLOBAL_LATENT_STORAGE.keys() if key_list.strip() == '*' else ','.split(key_list)
        keys = list(map(lambda key: key.strip(), keys))
        for key in keys:
            if key in GLOBAL_LATENT_STORAGE:
                del GLOBAL_LATENT_STORAGE[key.strip()]
        return {}

    @classmethod
    def IS_CHANGED():
        return ''.join(random.choice("abcdefghijklmnopqrstupvxyz") for _ in range(10))


NODE_CLASS_MAPPINGS = {
    "ImageStorageImport": ImageStorageImport,
    "ImageStorageExport": ImageStorageExport,
    "ImageStorageExportLoop": ImageStorageExportLoop,
    "ImageStorageReset": ImageStorageReset,
    "LatentStorageImport": LatentStorageImport,
    "LatentStorageExport": LatentStorageExport,
    "LatentStorageExportLoop": LatentStorageExportLoop,
    "LatentStorageReset": LatentStorageReset
}

@PromptServer.instance.routes.get("/loopchain/dataloader_length")
async def get_storage_length(request):
    storage_type = request.query["type"]
    storage_key = request.query["key"]
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
import torch

MAX_RESOLUTION=8192

class EmptyLatentImageLoop:
    def __init__(self, device="cpu"):
        self.device = device

    @classmethod
    def INPUT_TYPES(s):
        return {"required": { "width": ("INT", {"default": 512, "min": 64, "max": MAX_RESOLUTION, "step": 8}),
                              "height": ("INT", {"default": 512, "min": 64, "max": MAX_RESOLUTION, "step": 8}),
                              "batch_size": ("INT", {"default": 1, "min": 1, "max": 64}),
                              "num_loop": ("INT", {"default": 1, "min": 0}),
                              "loop_idx": ("INT", {"default": 0, "min": 0})
                              },
                "optional": {
                    "opt_pipeline": ("LOOPCHAIN_PIPELINE", )
                }}
    RETURN_TYPES = ("LATENT", "INT",)
    FUNCTION = "generate"

    CATEGORY = "Loopchain"

    def generate(self, width, height, loop_idx, batch_size, num_loop, opt_pipeline):
        latent = torch.zeros([batch_size, 4, height // 8, width // 8])
        return ({"samples":latent}, loop_idx, )

NODE_CLASS_MAPPINGS = {
    "EmptyLatentImageLoop": EmptyLatentImageLoop
}
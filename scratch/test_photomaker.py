import os
import sys

try:
    from gradio_client import Client, handle_file
except ImportError:
    os.system(f'"{sys.executable}" -m pip install gradio_client')
    from gradio_client import Client, handle_file

def test():
    space_name = "TencentARC/PhotoMaker"
    print(f"Connecting to: {space_name}...")
    client = Client(space_name)
    
    # Reference image path
    source_path = "assets/real_stars/prabhas.jpg"
    if not os.path.exists(source_path):
        print(f"Error: {source_path} not found.")
        return
        
    print(f"Generating stylized portrait for Prabhas using reference image {source_path}...")
    try:
        # Prompt requires the trigger word 'img' associated with class word (e.g. 'man img')
        prompt = "a beautiful digital anime painting of a man img, looking at camera, close-up portrait, clean outlines, detailed digital art, gorgeous illustration, warm lighting, anime style"
        
        # Call prediction
        result = client.predict(
            upload_images=[handle_file(source_path)],
            prompt=prompt,
            negative_prompt="nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
            style_name="Digital Art",
            num_steps=50,
            style_strength_ratio=20,
            num_outputs=1,
            guidance_scale=5,
            seed=0,
            api_name="/generate_image"
        )
        
        # Result format: (generated_images_gallery, usage_tips)
        # generated_images_gallery is a list of Dicts, e.g. [{"image": "filepath", "caption": None}]
        gallery, tips = result
        print(f"Success! Gallery returned: {gallery}")
        
        if gallery:
            generated_img_path = gallery[0]["image"]
            target_path = "scratch/test_photomaker_prabhas.png"
            import shutil
            shutil.copy2(generated_img_path, target_path)
            print(f"Successfully copied generated image to {target_path}")
            
    except Exception as e:
        print(f"Error during PhotoMaker execution: {e}")

if __name__ == "__main__":
    test()

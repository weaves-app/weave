from pathlib import Path
from PIL import Image, ImageOps
import sys
root=Path(sys.argv[1]);results=[]
for name in ['login-password','login-email-code','otp-keyboard','otp-invalid','login-restored']:
 p=next(root.rglob(name+'.png'));im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');w,h=im.size;pixels=im.load()
 orange=[(x,y) for y in range(100,h//2) for x in range(w//3,w*2//3) if pixels[x,y][0]>160 and 65<pixels[x,y][1]<155 and 35<pixels[x,y][2]<120 and pixels[x,y][0]>pixels[x,y][1]*1.45]
 assert orange, (name,'logo unavailable')
 oy1=min(y for x,y in orange);oy2=max(y for x,y in orange if y<oy1+150)
 ink=[(x,y) for y in range(oy1,oy2+1) for x in range(w//3,w*2//3) if pixels[x,y][1]<100 and pixels[x,y][1]>pixels[x,y][0]]
 lx1=min(x for x,y in ink);lx2=max(x for x,y in ink)
 # 400-point form is centered; heading first ink occurs below the brand's bottom.
 headline=next(y for y in range(oy2+35,min(oy2+400,h)) if sum(1 for x in range(w//2-400,w//2+400) if pixels[x,y][1]<100 and pixels[x,y][1]>pixels[x,y][0])>12)
 row=(oy1,oy2,headline);results.append(row);print(name,'logo y',oy1,oy2,'heading y',headline)
assert max(r[2] for r in results)-min(r[2] for r in results)<=3, 'Login/OTP heading origin moved'
assert len(set((r[0],r[1]) for r in results))==1,'logo moved'
print('PASS: stationary logo and common heading origin across five states')

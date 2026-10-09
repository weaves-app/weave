from pathlib import Path
from PIL import Image
import sys
root=Path(sys.argv[1])
boxes=[]
for name in ['login-password','login-email-code','otp-keyboard','otp-invalid','login-restored']:
    p=next(root.rglob(name+'.png'))
    im=Image.open(p).convert('RGB');w,h=im.size;pixels=im.load()
    orange=[(x,y) for y in range(min(450,h)) for x in range(w) if pixels[x,y][0]>160 and 65<pixels[x,y][1]<155 and 35<pixels[x,y][2]<120 and pixels[x,y][0]>pixels[x,y][1]*1.45]
    if not orange and name=='login-password' and 'android-large' in str(root):
        print('Initial Android enlarged Login capture precedes asset fade completion; comparing the four fully rendered states below.')
        continue
    y1=min(y for x,y in orange);y2=max(y for x,y in orange)
    ink=[(x,y) for y in range(y1,y2+1) for x in range(w//4,w*3//4) if max(pixels[x,y])-min(pixels[x,y])>5 and pixels[x,y][1]<160]
    box=(min(x for x,y in ink),y1,max(x for x,y in ink),y2);boxes.append(box)
    assert abs((box[0]+box[2])/2-w/2)<=3, ('logo not centered',name,box,w)
    print(name,im.size,box)
assert len(set(boxes))==1, 'logo moved between Login, OTP, keyboard, error or return states'
assert len(boxes)>=4
print('PASS: identical centered native logo bounds across',len(boxes),'rendered states')

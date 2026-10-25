"""Original Gym4Me schematic movement loops. Requires pillow and imageio-ffmpeg."""
from pathlib import Path
from PIL import Image, ImageDraw
import imageio_ffmpeg, math, subprocess
root=Path(__file__).resolve().parents[1]/'public/videos/exercises'
root.mkdir(parents=True,exist_ok=True)
for movement in ['squat','march','wall-push-up','glute-bridge']:
 out=root/(movement+'.mp4')
 cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','640x480','-r','20','-i','-','-an','-c:v','libx264','-profile:v','baseline','-pix_fmt','yuv420p','-movflags','+faststart','-crf','25',str(out)]
 encoder=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.DEVNULL)
 for i in range(120):
  phase=(1-math.cos(2*math.pi*i/60))/2
  image=Image.new('RGB',(640,480),'#f2f7f3');d=ImageDraw.Draw(image)
  d.line([(80,405),(560,405)],fill='#b9c9bc',width=4)
  if movement=='squat':
   head=(302-40*phase,100+60*phase);shoulder=(300-30*phase,155+60*phase);hip=(300-60*phase,250+40*phase);knee=(315+35*phase,325);ankle=(300,397);arm=(365-30*phase,210+20*phase)
  elif movement=='march':
   head=(310,95);shoulder=(310,150);hip=(310,250);lift=max(0,math.sin(2*math.pi*i/60));other=max(0,-math.sin(2*math.pi*i/60));knee=(285-20*lift,325-75*lift);ankle=(280-30*lift,397-75*lift);arm=(360,225);d.line([hip,(340+20*other,325-75*other),(350+30*other,397-75*other)],fill='#287448',width=18,joint='curve')
  elif movement=='wall-push-up':
   d.line([(180,70),(180,405)],fill='#b9c9bc',width=6);head=(245-22*phase,115);shoulder=(255-20*phase,165);hip=(310-10*phase,270);knee=(340,332);ankle=(365,397);arm=(185,185);d.line([shoulder,(220-10*phase,210),arm],fill='#287448',width=18,joint='curve')
  else:
   head=(150,355);shoulder=(205,365);hip=(305,365-95*phase);knee=(400,295);ankle=(440,397);arm=(245,390)
  d.line([shoulder,hip,knee,ankle],fill='#287448',width=20,joint='curve')
  if movement not in ['march','wall-push-up']:d.line([shoulder,arm],fill='#287448',width=15)
  if movement=='squat':d.line([hip,(275-20*phase,325),(260,397)],fill='#5a956e',width=16,joint='curve')
  if movement=='march':d.line([shoulder,arm],fill='#287448',width=15)
  d.line([head,shoulder],fill='#287448',width=15);d.ellipse([head[0]-25,head[1]-25,head[0]+25,head[1]+25],fill='#287448')
  for p in [shoulder,hip,knee]:d.ellipse([p[0]-7,p[1]-7,p[0]+7,p[1]+7],fill='#b7edca')
  d.arc([510,70,560,120],-90,-90+max(1,359*i/119),fill='#287448',width=6)
  encoder.stdin.write(image.tobytes())
 encoder.stdin.close()
 if encoder.wait()!=0:raise RuntimeError('Video encoder failed')
 for lang,text in [('fa','انیمیشن شماتیک حرکت؛ راهنمای متنی همین حرکت را بخوان.'),('en','Schematic movement loop. Read the accompanying exercise instructions.')]:
  (root/(movement+'.'+lang+'.vtt')).write_text('WEBVTT\n\n00:00.000 --> 00:06.000\n'+text+'\n')
 print(movement,out.stat().st_size)

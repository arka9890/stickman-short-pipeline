import numpy as np, wave
SR=44100
FPS=30.0
DUR=1547/FPS  # 51.5667 s
D=int(DUR*SR)
N=D
t=np.arange(N)/SR

# --- Brass tension full-length ---
# base low drone E2 (82.4) + F2 clash (87.3 -> tension)
env_slow=0.7+0.3*np.sin(2*np.pi*0.1*t)
drone=(0.5*np.sin(2*np.pi*82.4*t)+0.35*np.sin(2*np.pi*87.3*t)+0.3*np.sin(2*np.pi*164.8*t))*env_slow

# horn swells every ~6s, rising intensity toward the end
sig=drone.copy()
swell_times=np.arange(4.0,DUR-6,6.0)
for i,st in enumerate(swell_times):
    prog=(i+1)/len(swell_times)          # 0..1 intensity ramp
    a=0.35+0.45*prog
    s0=int(st*SR); sl=int(2.2*SR); e0=min(s0+sl,N)
    n=e0-s0
    tt=np.arange(n)/SR
    env=np.minimum(1,tt/0.6)*np.exp(-np.maximum(0,tt-1.2)/0.5)
    # horn note: rising minor-second clash (D3 + Eb3)
    f1=146.83+prog*15
    f2=f1*1.0595
    sig[s0:e0]+=a*env*(0.6*np.sin(2*np.pi*f1*tt)+0.5*np.sin(2*np.pi*f2*tt)+0.3*np.sin(2*np.pi*f1*2*tt))

# heartbeat drum every 1.2s, tighter near the end
for i in range(int(DUR/1.2)):
    prog=i/(DUR/1.2)
    st=int(i*1.2*SR)
    e=min(int(0.3*SR),N-st)
    if e<=0: break
    sig[st:st+e]+= (0.25+0.35*prog)*np.sin(2*np.pi*48*np.arange(e)/SR)*np.exp(-np.arange(e)/(0.08*SR))

# final: quick decay at the very end (no long autro); tiny fade to kill click for loop
tail=int(0.4*SR)
sig[-tail:]*=np.linspace(1,0,tail)
head=int(0.05*SR)
sig[:head]*=np.linspace(0,1,head)

sig=0.8*sig/(np.max(np.abs(sig))+1e-9)
# stereo widen with slight detune copy
left=sig
tt=np.arange(N)/SR
right=0.85*sig+0.15*np.sin(2*np.pi*(82.4+0.4)*tt)*env_slow*0.5
right=0.9*right/(np.max(np.abs(right))+1e-9)
st=np.stack([left,right],axis=1)
pcm=(st*32767).astype(np.int16)
with wave.open("public/audio/bgm_roman.wav","wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("bgm_roman.wav", round(DUR,3), "s")

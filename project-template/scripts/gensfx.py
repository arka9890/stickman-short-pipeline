import numpy as np, wave, os
SR=44100
out="public/audio/sfx2"
def wav(name,dur,f,outter=None,shape='sine',amp=0.6,decay=4):
    N=int(SR*dur)
    t=np.arange(N)/SR
    if shape=='sine': x=np.sin(2*np.pi*f*t)
    elif shape=='sweep': x=np.sin(2*np.pi*(f[0]+(f[1]-f[0])*t/dur)*t)
    x=x*np.exp(-t*decay)*amp
    fen=int(SR*0.005); x[:fen]*=np.arange(fen)/fen; x[-fen:]*=np.arange(fen)[::-1]/fen
    x=x*0.8/(np.max(np.abs(x))+1e-9)
    pcm=(x*32767).astype(np.int16)
    with wave.open(os.path.join(out,name),"wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(pcm.tobytes())
    print("wrote",name)
wav("whoosh-short.wav",0.25,[800,200],shape="sweep",amp=0.7,decay=8)
wav("whoosh-soft.wav",0.35,[600,150],shape="sweep",amp=0.4,decay=6)
wav("impact-soft-1.wav",0.18,90,shape="sine",amp=0.8,decay=18)
wav("impact-soft-3.wav",0.18,70,shape="sine",amp=0.7,decay=16)
wav("dry-thud.wav",0.12,55,shape="sine",amp=0.7,decay=24)
wav("stamp-thud.wav",0.16,80,shape="sine",amp=0.8,decay=20)
wav("pop-1.wav",0.08,660,shape="sine",amp=0.6,decay=30)
wav("pop-2.wav",0.08,880,shape="sine",amp=0.6,decay=30)
wav("sweep-long.wav",0.9,[220,900],shape="sweep",amp=0.5,decay=2)
PY
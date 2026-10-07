import math
REG = {}      # kebab-name -> list of elements
ALIAS = {}    # LucideName -> kebab-name
GROUP = {}    # kebab-name -> group label

import re as _re
def _norm(d): return _re.sub(r'(\d+)\.(\d*?)0+(?![\d.])', lambda m: m.group(1)+('.'+m.group(2) if m.group(2) else ''), d)
def P(d):  return ('p', _norm(d), False)
def PA(d): return ('p', _norm(d), True)
def R(x,y,w,h,rx=3.5):  return ('r',(x,y,w,h,rx),False)
def RA(x,y,w,h,rx=3.5): return ('r',(x,y,w,h,rx),True)
def C(cx,cy,r):  return ('c',(cx,cy,r),False)
def CA(cx,cy,r): return ('c',(cx,cy,r),True)
def D(cx,cy,r=1.2):  return ('d',(cx,cy,r),False)
def DA(cx,cy,r=1.2): return ('d',(cx,cy,r),True)
def G(transform, els): return ('g',transform,els)

_group = ['misc']
def group(name): _group[0]=name
def icon(name, els, lucide=()):
    REG[name]=els; GROUP[name]=_group[0]
    for l in lucide: ALIAS[l]=name

def pt(cx,cy,r,a): return (cx+r*math.cos(a), cy+r*math.sin(a))
def f(v): return ('%.2f'%v).rstrip('0').rstrip('.')

def gear(cx=12,cy=12,n=8,Ro=9.4,Ri=7.3,do=0.17,di=0.27):
    d=[]
    for i in range(n):
        a=2*math.pi*i/n - math.pi/2
        p1=pt(cx,cy,Ri,a-di); p2=pt(cx,cy,Ro,a-do); p3=pt(cx,cy,Ro,a+do); p4=pt(cx,cy,Ri,a+di)
        if i==0: d.append('M%s %s'%(f(p1[0]),f(p1[1])))
        else: d.append('A%s %s 0 0 1 %s %s'%(f(Ri),f(Ri),f(p1[0]),f(p1[1])))
        d.append('L%s %s L%s %s L%s %s'%(f(p2[0]),f(p2[1]),f(p3[0]),f(p3[1]),f(p4[0]),f(p4[1])))
    p0=pt(cx,cy,Ri,-math.pi/2-di)
    d.append('A%s %s 0 0 1 %s %s Z'%(f(Ri),f(Ri),f(p0[0]),f(p0[1])))
    return ' '.join(d)

def star(cx=12,cy=12.6,R_=9.3,r_=4.4):
    pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5
        pts.append(pt(cx,cy,R_ if i%2==0 else r_,a))
    return 'M'+' L'.join('%s %s'%(f(x),f(y)) for x,y in pts)+'Z'

def rays(cx=12,cy=12,r1=6.9,r2=9.2,n=8,skip=()):
    out=[]
    for i in range(n):
        if i in skip: continue
        a=2*math.pi*i/n
        p1=pt(cx,cy,r1,a); p2=pt(cx,cy,r2,a)
        out.append('M%s %sL%s %s'%(f(p1[0]),f(p1[1]),f(p2[0]),f(p2[1])))
    return ' '.join(out)

SW=1.75
def pascal(k): return ''.join(w.capitalize() for w in k.split('-'))

def render_els(els, mode, base, accent):
    """mode: 'file' (colors baked) | 'react' (jsx) | 'sprite'"""
    out=[]
    for e in els:
        k,dat,a=e[0],e[1],e[2]
        if k=='g':
            out.append('<g transform="%s">%s</g>'%(dat, render_els(a,mode,base,accent) if False else render_els(e[2],mode,base,accent)))
            continue
        if mode=='react':
            sty = ' style={{stroke:"var(--rf-accent, currentColor)"}}' if a else ''
            stf = ' style={{fill:"var(--rf-accent, currentColor)"}}' if a else ''
            cls = ' className="rf-a"' if a else ''
        else:
            col = accent if a else base
            sty = ' stroke="%s"'%col if (a and accent!=base) else ''
            stf = ' fill="%s"'%col if (a and accent!=base) else ''
            cls = ''
        clsp = cls + (' pathLength={1}' if (mode=='react' and a) else '')
        if k=='p': out.append('<path d="%s"%s%s/>'%(dat,clsp,sty))
        elif k=='r':
            x,y,w,h,rx=dat; out.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s"%s%s/>'%(f(x),f(y),f(w),f(h),f(rx),clsp,sty))
        elif k=='c':
            cx,cy,r=dat; out.append('<circle cx="%s" cy="%s" r="%s"%s%s/>'%(f(cx),f(cy),f(r),clsp,sty))
        elif k=='d':
            cx,cy,r=dat
            base_fill = '' if mode=='react' else ('' if (a and accent!=base) else ' fill="%s"'%base)
            if mode=='react':
                out.append('<circle cx="%s" cy="%s" r="%s"%s stroke="none"%s/>'%(f(cx),f(cy),f(r),cls, stf if a else ' fill="currentColor"'))
            else:
                out.append('<circle cx="%s" cy="%s" r="%s" stroke="none"%s/>'%(f(cx),f(cy),f(r), ' fill="%s"'%(accent if a else base)))
    return ''.join(out)

def svg_file(name, base='currentColor', accent=None, size=24, sw=SW):
    accent = accent or base
    inner = render_els(REG[name],'file',base,accent)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="%s" '
            'stroke-width="%s" stroke-linecap="round" stroke-linejoin="round">%s</svg>')%(size,size,base,sw,inner)

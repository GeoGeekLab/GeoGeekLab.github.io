// Flow V3 — Plate Carrée coordinates, preserved at a true 2:1 world aspect.
// Pan and zoom apply after fitting a 360° × 180° world into a rectangular stage.
export function createPlateCarreeViewport(width,height,zoom=1,panX=0,panY=0) {
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
  const scale=Math.max(.05,Number(zoom)||1);
  const fittedWidth=Math.min(w,2*h),fittedHeight=fittedWidth/2;
  const worldWidth=fittedWidth*scale,worldHeight=fittedHeight*scale;
  const left=(w-worldWidth)/2+(Number(panX)||0);
  const top=(h-worldHeight)/2+(Number(panY)||0);
  function project(lon,lat) {
    return [left+(lon+180)/360*worldWidth,top+(90-lat)/180*worldHeight];
  }
  function unproject(x,y) {
    return {lon:(x-left)/worldWidth*360-180,lat:90-(y-top)/worldHeight*180};
  }
  function invert(x,y) {
    if (!Number.isFinite(x)||!Number.isFinite(y) ||
        x<left||x>left+worldWidth||y<top||y>top+worldHeight)
      return {valid:false,reason:'outside-map-frame'};
    const {lon,lat}=unproject(x,y);
    return {valid:true,lon:((lon+180)%360+360)%360-180,lat:Math.max(-90,Math.min(90,lat))};
  }
  // The projection is isotropic in degrees; the geographic EW/NS distortion
  // is a physical cos(latitude) effect, not viewport stretching.
  return {width:w,height:h,fittedWidth,fittedHeight,worldWidth,worldHeight,
    left,top,scale,project,unproject,invert};
}
export function eastWestToNorthSouthScale(latitude) {
  if(!Number.isFinite(latitude)||Math.abs(latitude)>=90)return null;
  return 1/Math.cos(latitude*Math.PI/180);
}

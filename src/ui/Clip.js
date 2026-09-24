// 事件小動畫：網頁版直接播影片，App 版退回封面靜態圖
import { createElement } from 'react';
import { Image, Platform, View } from 'react-native';
import { PHOTO } from './art/photos';

// ratio = 寬 / 高，用來撐出正確的版面高度，不會把人頭切掉
// 沒有 uri 的就是純封面插圖（事件卡用），按下選項之後才播動畫
export const CLIP = {
  bike_cover: { poster: 'bike_cover', ratio: 960 / 640 },
  bike_ride: { uri: 'art/clip_bike_ride', poster: 'bike_ride', ratio: 720 / 302 },
  bike_wheels: { uri: 'art/clip_bike_wheels', poster: 'bike_wheels', ratio: 720 / 430 },
};

export const hasClip = (name) => !!CLIP[name];
export const clipDelay = () => 1400;


export default function Clip({ name, loop = true, radius = 18, style }) {
  const c = CLIP[name];
  if (!c) return null;
  const box = [{ width: '100%', aspectRatio: c.ratio, borderRadius: radius, overflow: 'hidden', backgroundColor: '#161a3d' }, style];

  // 沒有影片（純插圖），或是 App 版不播影片：直接顯示圖
  if (!c.uri || Platform.OS !== 'web') {
    return (
      <View style={box}>
        <Image source={PHOTO[c.poster]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={box}>
      {createElement(
        'video',
        {
          poster: PHOTO[c.poster] && PHOTO[c.poster].uri,
          autoPlay: true,
          muted: true,
          loop,
          playsInline: true,
          preload: 'auto',
          style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
        },
        // 兩種格式都放：一般瀏覽器吃 mp4，少數不支援 H.264 的用 webm
        createElement('source', { key: 'mp4', src: `${c.uri}.mp4`, type: 'video/mp4' }),
        createElement('source', { key: 'webm', src: `${c.uri}.webm`, type: 'video/webm' }),
      )}
    </View>
  );
}

export const corsProxyUrl = (originalUrl: string) =>
  'https://corsproxy.io/?' + encodeURIComponent(originalUrl);
  
export const imageUrl = (url: string) =>
  corsProxyUrl(`https://imageproxy.a2d.tv?width=400&source=${url}`);

export const sortRandom = () => Math.random() - 0.5;

import { useMemo, useState } from "react";

function Videos() {
  // Add your videos here - just edit the title and link
  const videos = [
    { title: "How to make hydrabadi biryani", link: "https://www.youtube.com/watch?v=mRNe05EADi0" },
    { title: "Babai cooking", link: "https://www.youtube.com/watch?v=Bd0JIvF20Zg" },
    { title: "Nalli mulee cooking", link: "https://www.youtube.com/watch?v=Hk7tzYMyqFg" },
  ];

  const [selectedVideo, setSelectedVideo] = useState(videos[0]);

  const embedLink = useMemo(() => {
    if (!selectedVideo?.link) return "";
    const ytWatch = selectedVideo.link.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    if (ytWatch) {
      return `https://www.youtube.com/embed/${ytWatch[1]}`;
    }
    return selectedVideo.link;
  }, [selectedVideo]);

  const isDirectVideo = selectedVideo?.link.match(/\.(mp4|webm|ogg)(\?|$)/i);

  return (
    <div className="page">
      <h1>Video Library</h1>
      <p>Click on any video below to play it.</p>

      <div className="video-player">
        {isDirectVideo ? (
          <video controls className="video-frame">
            <source src={selectedVideo.link} />
            Your browser does not support this video format.
          </video>
        ) : (
          <iframe
            className="video-frame"
            src={embedLink}
            title={selectedVideo.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        )}
      </div>

      <div className="products">
        {videos.map((video) => (
          <div
            key={video.title}
            className={`card ${selectedVideo.title === video.title ? 'active' : ''}`}
            onClick={() => setSelectedVideo(video)}
            style={{ cursor: 'pointer' }}
          >
            <h3>{video.title}</h3>
            <p>Click to play</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Videos;
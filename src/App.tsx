import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Sprite, Text, useTick, Container } from '@pixi/react';
import {
  BlurFilter,
  TextStyle,
  ColorMatrixFilter,
  Sprite as OrigSprite,
} from 'pixi.js';
import { fetchPrograms } from './api';
import { imageUrl, sortRandom } from './helpers';
import backgroundImage from './bg.avif';

const width = window.innerWidth;
const height = Math.min(width * (9 / 16), window.innerHeight);

const downSpeed = height / 200;
const sideSpeed = width / 200;

const Inner: React.FC<GameViewProps> = ({ setGameState }) => {
  const [x, setX] = useState(width / 2);
  const [y, setY] = useState(0);
  const [score, setScore] = useState(0);
  const [programs, setPrograms] = useState<any[]>([]);
  const [genreList, setGenreList] = useState<string[]>([]);
  const [currentGenres, setCurrentGenres] = useState<string[]>([]);
  const [yeyOpacity, setYeyOpacity] = useState(0);

  const [leftArrow, setLeftArrow] = useState(false);
  const [rightArrow, setRightArrow] = useState(false);

  const currentProgram = programs?.[0];

  const genresWithPosition = currentGenres.map((genre, index) => {
    const start = (index * width) / currentGenres.length;
    const genreWidth = width / currentGenres.length;
    return {
      genre,
      width: genreWidth,
      start,
      end: start + genreWidth,
    };
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setLeftArrow(true);
    }
    if (e.key === 'ArrowRight') {
      setRightArrow(true);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setLeftArrow(false);
    }
    if (e.key === 'ArrowRight') {
      setRightArrow(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextProgram = () => setPrograms(programs.slice(1));

  useEffect(() => {
    if (!programs.length) return;

    // Preload next image
    OrigSprite.from(
      imageUrl(programs[1].images.main16x9Annotated.sourceEncoded)
    );

    // Pick one correct genre
    const correctGenre =
      currentProgram.genres[
        Math.floor(Math.random() * currentProgram.genres.length)
      ];

    // Pick 3 non correct genres
    const wrongGenres = genreList
      .filter((genre) => genre !== correctGenre)
      .sort(sortRandom)
      .slice(0, 3);

    const genreOptions = [correctGenre, ...wrongGenres].sort(sortRandom);
    setCurrentGenres(genreOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs]);

  useEffect(() => {
    fetchPrograms().then(({ programs, genres }) => {
      // Preload image
      OrigSprite.from(
        imageUrl(programs[0].images.main16x9Annotated.sourceEncoded)
      );

      setTimeout(() => {
        setGenreList(genres);
        setPrograms(programs);
      }, 1200);
    });
  }, []);

  useTick((delta) => {
    if (yeyOpacity > 0) {
      setYeyOpacity(yeyOpacity - 0.005);
    }

    if (!currentProgram) return;

    if (leftArrow) {
      setX(x - sideSpeed * delta);
    }
    if (rightArrow) {
      setX(x + sideSpeed * delta);
    }

    if (y > height) {
      const scoredGenre = genresWithPosition.find(
        ({ start, end }) => x > start && x < end
      );

      if (currentProgram.genres.includes(scoredGenre?.genre)) {
        setY(0);
        setX(width / 2);
        setScore(score + 1);
        nextProgram();
        setYeyOpacity(1);
      } else {
        setGameState({
          status: 'end',
          data: { score, program: currentProgram },
        });
      }
    } else {
      setY(y + downSpeed * delta);
    }
  });

  const blurFilter = useMemo(() => new BlurFilter(10), []);
  const darkenFilter = useMemo(() => {
    const colorMatrix = new ColorMatrixFilter();
    colorMatrix.brightness(0.5, false);
    return colorMatrix;
  }, []);

  return (
    <>
      <Sprite
        filters={[blurFilter, darkenFilter]}
        image={backgroundImage}
        width={width}
        height={height}
      />
      <ScoreText score={score} />
      <CorrectAnswer opacity={yeyOpacity} />
      {currentProgram && (
        <MovingProgram
          x={x}
          y={y}
          image={currentProgram.images.main16x9Annotated.sourceEncoded}
        />
      )}
      {genresWithPosition.map(({ genre, width, start }, index) => (
        <Container key={index} x={start} y={height - 150}>
          <Text
            text={genre}
            style={
              new TextStyle({
                fill: 'white',
                fontSize: 30,
                stroke: 'black',
                strokeThickness: 4,
              })
            }
            x={width / 2}
            y={50}
            anchor={[0.5, 0.5]}
          />
        </Container>
      ))}
    </>
  );
};

const ScoreText: React.FC<{ score: number }> = ({ score }) => (
  <Text
    text={`Poäng: ${score}`}
    style={
      new TextStyle({
        fontSize: 24,
        fill: 'white',
        stroke: 'black',
        strokeThickness: 4,
      })
    }
    x={10}
    y={10}
  />
);

const CorrectAnswer: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <Text
      text={`Rätt!`}
      alpha={opacity}
      style={
        new TextStyle({
          fontSize: 30,
          fill: 'lightgreen',
        })
      }
      x={width / 2}
      y={height / 3}
    />
  );
};

const MovingProgram: React.FC<{ image: string; x: number; y: number }> = ({
  image,
  x,
  y,
}) => {
  return (
    <Sprite
      image={imageUrl(image)}
      x={x}
      y={y}
      width={240}
      height={135}
      anchor={[0.5, 0.5]}
    />
  );
};

type GameState = {
  status: 'intro' | 'game' | 'end';
  data?: any;
};

type GameViewProps = {
  setGameState: (state: GameState, data?: any) => void;
  gameState?: GameState;
};

const Introscreen: React.FC<GameViewProps> = ({ setGameState }) => {
  return (
    <div className="container">
      <div className="heading">Gissa genren! 🎮</div>

      <div className="text">
        Kolla vilket tv4-program som visas och tryck på vänster eller höger
        piltangent för att placera programmet i rätt genre.
      </div>
      <button
        className="button"
        onClick={() => setGameState({ status: 'game' })}
      >
        Spela
      </button>
    </div>
  );
};

const Endscreen: React.FC<GameViewProps> = ({ setGameState, gameState }) => {
  const link = 'https://www.tv4play.se/program/' + gameState?.data?.program?.id;
  return (
    <div className="container">
      <div className="heading">Det var tyvärr fel 😭</div>

      <div className="text">
        <strong>{gameState?.data?.program?.title}</strong> är i genren{' '}
        <strong>{gameState?.data?.program?.genres.join(', ')}</strong>
      </div>

      <div className="text">
        Du fick <strong>{gameState?.data?.score}</strong> poäng!
      </div>

      <div className="text">
        Om du vill titta på <strong>{gameState?.data?.program?.title}</strong>{' '}
        kan du göra det här: <a href={link}>{link}</a>
      </div>

      <button
        className="button"
        onClick={() => setGameState({ status: 'game' })}
      >
        Spela igen
      </button>
    </div>
  );
};

const Game: React.FC<GameViewProps> = ({ setGameState }) => (
  <Stage width={width} height={height}>
    <Inner setGameState={setGameState} />
  </Stage>
);

const App = () => {
  const [gameState, setGameState] = useState<GameState>({ status: 'intro' });

  switch (gameState.status) {
    case 'intro':
      return <Introscreen setGameState={setGameState} />;
    case 'game':
      return <Game setGameState={setGameState} />;
    case 'end':
      return <Endscreen gameState={gameState} setGameState={setGameState} />;
  }
};

export default App;

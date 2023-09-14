const app = new PIXI.Application({ resizeTo: window });

document.body.appendChild(app.view);

// create a new background sprite
const background = PIXI.Sprite.from('bg.avif');

background.width = app.screen.width;
background.height = app.screen.height;
app.stage.addChild(background);

const scoreText = new PIXI.Text('', {
  fontSize: 24,
  fill: 'white',
  stroke: 'black',
  strokeThickness: 4,
});
scoreText.x = 10;
scoreText.y = 10;

app.stage.addChild(scoreText);

const sortRandom = () => Math.random() - 0.5;

const fetchMediaData = async () => {
  const offset = Math.floor(Math.random() * 800);
  try {
    const response = await axios.post(
      'https://client-gateway.tv4.a2d.tv/graphql',
      {
        query: `
        query {
          mediaIndex {
            contentList(input: { offset: ${offset}, limit: 100}) {
              items {
                ... on MediaIndexMovieItem {
                  movie {
                    __typename
                    id
                    title
                    genres
                    images {
                      main16x9Annotated {
                        sourceEncoded
                      }
                    }
                  }
                }
                ... on MediaIndexSeriesItem {
                  series {
                    __typename
                    id
                    title
                    genres
                    images {
                      main16x9Annotated {
                        sourceEncoded
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      },
      {
        headers: {
          'client-name': 'tv4-ninja',
          'client-version': '0.0.1',
        },
      }
    );

    // Extract and handle the data from the response
    const mediaData = response.data.data.mediaIndex.contentList.items.map(
      (item) => item.movie || item.series
    );
    return mediaData;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

const corsProxyUrl = (originalUrl) =>
  'https://corsproxy.io/?' + encodeURIComponent(originalUrl);
const imageUrl = (url) =>
  corsProxyUrl(`https://imageproxy.a2d.tv?width=400&source=${url}`);

let leftDown = false;
let rightDown = false;
let programList;
let genreList;
let currentProgram;
let points = 0;
const moveSpeed = 5;

let genreBoxes = [];

const spawnProgram = () => {
  const programData = programList.shift();
  if (currentProgram) {
    currentProgram.destroy();
    currentProgram = null;
  }
  // create a new Sprite that uses the image name that we just generated as its source
  const spawned = PIXI.Sprite.from(
    imageUrl(programData.images.main16x9Annotated.sourceEncoded)
  );

  // Prewarm the cache
  PIXI.Sprite.from(
    imageUrl(programList[0].images.main16x9Annotated.sourceEncoded)
  );

  spawned.anchor.set(0.5);
  spawned.x = 0.5 * app.screen.width;
  spawned.y = 0;
  spawned.width = 240;
  spawned.height = 135;
  spawned.speed = 1;
  spawned.programData = programData;

  app.stage.addChild(spawned);
  currentProgram = spawned;

  // pick one correct genre
  const correctGenre =
    programData.genres[Math.floor(Math.random() * programData.genres.length)];

  // pick 3 non correct genres
  const wrongGenres = genreList
    .filter((genre) => genre !== correctGenre)
    .sort(sortRandom)
    .slice(0, 3);

  // merge the two arrays and randomise order
  const allGenres = [correctGenre, ...wrongGenres].sort(sortRandom);
  addGenreBoxes(allGenres);
};

fetchMediaData().then((media) => {
  media.sort(sortRandom);
  programList = media;
  genreList = [...new Set(media.flatMap((program) => program.genres))];

  spawnProgram();
});

app.ticker.add(() => {
  if (currentProgram) {
    if (leftDown) {
      currentProgram.x -= moveSpeed;
    }

    if (rightDown) {
      currentProgram.x += moveSpeed;
    }

    currentProgram.y += currentProgram.speed;

    genreBoxes.forEach((box) => {
      if (checkCollision(currentProgram, box)) {
        console.log('hit', box.genre);

        if (currentProgram.programData.genres.includes(box.genre)) {
          console.log('correct');
          points += 1;
          scoreText.text = `Poäng: ${points}`;
        } else {
          console.log('wrong', currentProgram.programData.genres);

          // destroy the app
          app.destroy(true);

          // add a h1 and a link within a div in the body tag
          document.body.innerHTML = `
            <div style="text-align: center; margin-top: 100px;">
                <p>Det var tyvärr fel! <strong>${
                  currentProgram.programData.title
                }</strong> är i genren: ${currentProgram.programData.genres.join(
            ', '
          )}.</p>

                <p>Du fick ${points} poäng!</p>

                <p>Om du vill spela igen kan du klicka <a href="/">här</a>.</p>
                
                <p>Om du vill kolla på <strong>${
                  currentProgram.programData.title
                }</strong> kan du göra det här: <a href="https://www.tv4play.se/program/${
            currentProgram.programData.id
          }" target="_blank">https://www.tv4play.se/program/${
            currentProgram.programData.id
          }</a></p>
            </div>
            `;
        }

        spawnProgram();
      }
    });
  }
});

window.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      leftDown = true;
      break;
    case 'ArrowRight':
      rightDown = true;
      break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      leftDown = false;
      break;
    case 'ArrowRight':
      rightDown = false;
      break;
  }
});

const checkCollision = (rect1, rect2) => {
  const bounds1 = rect1.getBounds();
  const bounds2 = rect2.getBounds();

  return (
    bounds1.x < bounds2.x + bounds2.width &&
    bounds1.x + bounds1.width > bounds2.x &&
    bounds1.y < bounds2.y + bounds2.height &&
    bounds1.y + bounds1.height > bounds2.y
  );
};

const addGenreBoxes = (genres) => {
  genreBoxes.forEach((box) => app.stage.removeChild(box));
  genreBoxes = [];
  // Width and height for each box
  const boxWidth = app.view.width / genres.length;
  const boxHeight = 100; // or any desired height

  genres.forEach((text, index) => {
    const container = new PIXI.Container();

    // Create the black rectangle
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0x000000); // black color
    graphics.drawRect(0, 0, boxWidth, boxHeight);
    graphics.endFill();
    container.addChild(graphics);

    // Create the text and center it inside the box
    const textBox = new PIXI.Text(text, { fill: 'white', fontSize: 24 });
    textBox.x = (boxWidth - textBox.width) / 2;
    textBox.y = (boxHeight - textBox.height) / 2;
    container.addChild(textBox);

    // Position the container at the bottom and according to its index
    container.x = index * boxWidth;
    container.y = app.view.height - boxHeight;

    container.genre = text;

    genreBoxes.push(container);

    // Add the container to the stage
    app.stage.addChild(container);
  });
};

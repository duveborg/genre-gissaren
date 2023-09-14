import axios from 'axios';
import { sortRandom } from './helpers';

export const fetchPrograms = async () => {
  const offset = Math.floor(Math.random() * 800);
  try {
    const response = await axios.post(
      'https://client-gateway.tv4.a2d.tv/graphql',
      {
        query: `
        query {
          mediaIndex {
            overview {
                genres {
                    name
                }
            }
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

    const programs = response.data.data.mediaIndex.contentList.items.map(
      (item: any) => item.movie || item.series
    ).sort(sortRandom);

    const genres = response.data.data.mediaIndex.overview.genres.map(
      (genre: any) => genre.name
    );
    return { programs, genres };
  } catch (error) {
    console.error('Error fetching data:', error);
  }
  return {};
};

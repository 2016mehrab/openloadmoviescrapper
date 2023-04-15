const request = require("request");
const cheerio = require("cheerio");
const { default: axios } = require("axios");
const fs = require("fs");
const moment = require("moment");

const getMovieURL = () => {
  return new Promise((resolve, reject) => {
    // Use request.get() to make the HTTP request
    // const thikana = "https://www.openloadmovies.ro/genre/horror/";

    const thikana = process.argv[2];
    console.log(thikana);
    request(thikana, (error, response, html) => {
      if (!error && response.statusCode == 200) {
        // Extract data from the response
        const $ = cheerio.load(html);
        let hrefs = [];
        $("div.items.normal article.item.movies a").each((i, link) => {
          const href = $(link).attr("href");
          hrefs.push(href);
        });
        const uniqueHrefs = [...new Set(hrefs)];

        // Define the getMovieData function inside the getMovieURL function
        const getMovieData = (url) => {
          // Return a new Promise object
          return new Promise((resolve, reject) => {
            request(url, async (error, response, html) => {
              if (!error && response.statusCode == 200) {
                const $ = cheerio.load(html);

                const title = $("div.data h1").text();
                const posterSrc = $("div.poster img").attr("data-src");
                let poster;
                try {
                  const response = await axios.get(posterSrc, {
                    responseType: "arraybuffer",
                  });

                  const imageData = response.data;

                  poster = Buffer.from(imageData, "binary").toString("base64");
                } catch (error) {
                  poster = "";
                  console.log("couldnot retrive image");
                }
                const dateElement = $("div.extra span.date");

                const dateText = dateElement.text();

                const date = moment(dateText, "MMM. DD, YYYY");

                const mysqlDate = date.format("YYYY-MM-DD");
                const synopsis = $(".wp-content p").text();
                let cast = [];
                const castDiv = $("#cast [itemprop=actor] a[itemprop=url]");
                castDiv.each((index, element) => {
                  cast.push($(element).text());
                });
                const genre = [];
                const genreDiv = $(".sgeneros");
                genreDiv.find("a").each((index, element) => {
                  genre.push($(element).text());
                });
                const directorDiv = $("div[itemprop=director]");
                const directorMeta = directorDiv.find("meta");
                const director = directorMeta.attr("content");

                const movieData = {
                  title,
                  mysqlDate,
                  genre,
                  poster,
                  synopsis,
                  cast,
                  director,
                };

                resolve(movieData);
              } else {
                reject(error);
              }
            });
          });
        };

        Promise.all(uniqueHrefs.map(getMovieData)).then((results) => {
          resolve(results);
        });
      } else {
        reject(error);
      }
    });
  });
};

const main = async () => {
  const results = await getMovieURL();

  const resultsJSON = JSON.stringify(results);

  fs.writeFile(process.argv[3], resultsJSON, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("Results written to file successfully");
  });
};

main();

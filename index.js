require("dotenv").config();
const { writeJSON } = require("fs-extra");
const { set } = require("lodash");
const request = require("superagent");
const config = require("./config.json");

const API_URL = "https://www.transifex.com/api/2";

async function main() {
  const { resources } = config;

  const chart = {
    type: "horizontalBar",
    data: {
      labels: [],
      datasets: [
        {
          label: "Traduzidas",
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgb(54, 162, 235)",
          data: [],
        },
        {
          label: "A traduzir",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgb(255, 99, 132)",
          borderWidth: 1,
          data: [],
        },
        {
          label: "Revisadas",
          backgroundColor: "rgba(99, 255, 136, 0.5)",
          borderColor: "rgb(99, 255, 136)",
          borderWidth: 1,
          data: [],
        },
      ],
    },
    options: {
      elements: {
        rectangle: {
          borderWidth: 2,
        },
      },
      responsive: true,
      legend: {
        position: "bottom",
      },
      title: {
        display: true,
        text: "Entidades em pt-BR no Transifex (%)",
      },
    },
  };

  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];
    const [projectId, resourceId, languageId] = resource.url.split("/");

    try {
      const { body: status } = await request
        .get(
          [
            API_URL,
            "project",
            projectId,
            "resource",
            resourceId,
            "stats",
            languageId,
          ].join("/")
        )
        .auth("api", process.env.TRANSIFEX_API_KEY);

      const totalWords =
        status.untranslated_entities + status.translated_entities;

      let untranslatedPercentage =
        (status.untranslated_entities / totalWords) * 100;

      // Bump to one percent to make the bar visible
      if (untranslatedPercentage < 1 && untranslatedPercentage > 0) {
        untranslatedPercentage = 1;
      }

      let reviewedPercentage =
        (status.reviewed / status.translated_entities) * 100;

      // Bump to one percent to make the bar visible
      if (reviewedPercentage < 1 && reviewedPercentage > 0) {
        reviewedPercentage = 1;
      }

      set(chart, `data.labels[${i}]`, resource.displayName);
      set(chart, `data.datasets[0].data[${i}]`, 100 - untranslatedPercentage);
      set(chart, `data.datasets[1].data[${i}]`, -untranslatedPercentage);
      set(chart, `data.datasets[2].data[${i}]`, reviewedPercentage);
    } catch (error) {
      console.log(error);
      return;
    }

    writeJSON("./chart.json", chart, { spaces: 2 });
  }
}

main();

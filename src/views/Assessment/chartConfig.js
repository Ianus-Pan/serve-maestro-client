
export const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        r: {
            min: 0,
            max: 5,
            pointLabels: {
                font: {
                    size: 12
                }
            },
            ticks: {
                backdropColor: 'rgba(0, 0, 0, 0)',
                font: {
                    size: 16
                }
            }
        }
    },
    onHover: (event, chartElement) => {
        //     console.log(chartElement)
        // event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
    },
    plugins: {
        legend: {
            onHover: (event, legendItem, legend) => {
                //     console.log(chartElement)
                event.native.target.style.cursor = 'pointer';
            },
            onLeave: (event, legendItem, legend) => {
                //     console.log(chartElement)
                event.native.target.style.cursor = 'default';
            },
        },
    }
  }
export const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            min: 0,
            max: 5,
        },
    },
    onHover: (event, chartElement) => {
        //     console.log(chartElement)
        // event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
    },
    plugins: {
        legend: {
            onHover: (event, legendItem, legend) => {
                //     console.log(chartElement)
                event.native.target.style.cursor = 'pointer';
            },
            onLeave: (event, legendItem, legend) => {
                //     console.log(chartElement)
                event.native.target.style.cursor = 'default';
            },
        },
    }
}

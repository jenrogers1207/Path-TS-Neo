import * as d3 from 'D3';
export class QueryObject {
    constructor(queryVal) {

        this.symbol = '';
        this.name = queryVal;
        this.ncbi = '';
        this.keggId = '';
    }
}

export class SelectedQuery {
    constructor(queryOb) {

        this.queryOb = queryOb;
    }
}

export const SelectedTest = new SelectedQuery(null);

export async function drawSelectedPanel(query) {
    let panel = d3.select('#query-panel');
    panel.selectAll('*').remove();
    panel.append('h2').text(query.name);
    query.description != undefined ? panel.append('text').text(query.description) : panel.append('text').text('pathway');

}
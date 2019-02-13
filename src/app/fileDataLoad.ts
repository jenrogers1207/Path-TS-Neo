import * as d3 from 'D3';
import * as data from './testData.json';


export async function loadFile(){

    let dataFixed = data.default.map(d=> d);

    let test = d3.nest().key(function(d) { return d.gene; })
    .entries(dataFixed);

    return test;
}

export async function renderSidebar(data: Object){

    let sidebar = d3.select('#left-nav');
    let callTable = sidebar.select('.call-table');
    let geneHeader = callTable.selectAll('.gene').data(data);
    geneHeader.exit().remove();
    let geneHeadEnter = geneHeader.enter().append('div').attr('class', d=> d.key).classed('gene', true);
    geneHeadEnter.append('text').text(d=> d.key);
    geneHeader = geneHeadEnter.merge(geneHeader);

    console.log(data);

    let variants = geneHeader.selectAll('.variant').data(d=>d.values);
    let varEnter = variants.enter().append('div').classed('variant', true);
    varEnter.append('text').text(d=>d.variation);
}


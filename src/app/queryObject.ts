import * as d3 from 'D3';
export class QueryObject {

    value:string;
    ncbi:string;
    keggId:string;
    properties: object;
    entrez:string;
    type:string;

    constructor(queryVal:string) {
        this.type = ''
        this.value = queryVal;
        this.properties = {
            'ids': {}
        };
    }
}

export class VariantObject {

    type:string;
   // value:string;
    gene:string;
    dbSnp:string;
    properties:object;

    constructor(snpId:string) {
        this.type = 'Variant'
        this.dbSnp = snpId;
      
}
}

export class SelectedQuery {
    queryOb: QueryObject;

    constructor(queryObPassed: QueryObject) {

        this.queryOb = queryObPassed;
    }
}

export class QueryKeeper{
    queryKeeper: Array<QueryObject>;

    constructor() {
    this.queryKeeper = [];
    }

    addQueryOb(queryOb: QueryObject){
        this.queryKeeper.push(queryOb);
    }
}

export const SelectedTest = new SelectedQuery(null);

export async function drawSelectedPanel(query) {
    let panel = d3.select('#query-panel');
    panel.selectAll('*').remove();
    panel.append('h2').text(query.name);
    query.description != undefined ? panel.append('text').text(query.description) : panel.append('text').text('pathway');

}
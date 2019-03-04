import * as d3 from 'D3';
var search = require('./search');

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
    name:string;
    gene:string;
    dbSnp:string;
    properties:object;

    constructor(snpId:string) {
        this.type = 'Variant';
        this.name = snpId;  
        this.dbSnp = snpId; 
    }
}

export class PathwayObject {

    type:string;
    genes:string;
    properties:object;

    constructor(pathId:string) {
        this.type = 'Pathway';
}
}

export class PhenotypeObject {

    type: string;
    name: string;

    constructor(phenoId:string) {
        this.type = 'Phenotype';
        this.name = phenoId;
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

export async function structVariants(nodeP: object){
    console.log("in strructurer", nodeP)
    let nodeOb = await Promise.resolve(nodeP)

    let variants = nodeOb.properties ? nodeOb.properties.allelicVariantList : JSON.parse(nodeOb.data.allelicVariantList);
    if(!nodeOb.properties){ nodeOb.properties = nodeOb.data}

    nodeOb.properties.allelicVariantList = await variants.map(v=> {
        let variantOb = new VariantObject(v.dbSnps);
        variantOb.name = v.dbSnps;
        variantOb.dbSnps = v.dbSnp;
        variantOb.gene = nodeOb.value;
        variantOb.mimNumber = v.mimNumber;
        variantOb.mutations = v.mutations;
        variantOb.description = v.name;
        variantOb.clinvarAccessions = v.clinvarAccessions;
        variantOb.text = v.text;
        variantOb.props = search.loadSNP(variantOb.name).then(d=> console.log(d));
      //  console.log(variantOb.props)
        return variantOb;
    });
    return await nodeOb
}

export async function drawSelectedPanel(query) {
    let panel = d3.select('#query-panel');
    panel.selectAll('*').remove();
    panel.append('h2').text(query.name);
    query.description != undefined ? panel.append('text').text(query.description) : panel.append('text').text('pathway');

}
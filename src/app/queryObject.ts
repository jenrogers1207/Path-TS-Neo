import * as d3 from 'D3';
var search = require('./search');

export class SelectedOb {

}

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
            'Ids': {},
            'Location': {},
            'Phenotypes': {},
            'Models':{},
            'Text':{},
            'References':{},
            'Symbols':{},
            'Description':{},
            'Variants':{}
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

    let nodeOb = await Promise.resolve(nodeP)
 
    let variants = typeof nodeOb.properties.allelicVariantList === 'string' ? JSON.parse(nodeOb.properties.allelicVariantList) : nodeOb.properties.allelicVariantList;
    if(!nodeOb.properties){ nodeOb.properties = nodeOb.data}
    
    nodeOb.properties.allelicVariantList = variants.map(v=> {
        let snpName = v.properties? v.properties.dbsnp : v.dbSnps;
        let variantOb = new VariantObject(snpName);
        variantOb.name = snpName;
        variantOb.gene = nodeOb.value;
        variantOb.mimNumber = v.properties? v.properties.mimNumber : v.mimNumber;
        variantOb.mutations = v.properties? v.properties.mutations : v.mutations;
        variantOb.description = v.properties? v.properties.description : v.name;
        variantOb.clinvarAccessions = v.properties? v.properties.clinvarAccessions : v.clinvarAccessions;
        variantOb.text = v.properties? v.properties.text : v.text;
        variantOb.snpProps = getSNP(variantOb, v);
        
        console.log(variantOb);
        return variantOb;
    });
    return nodeOb;
}

async function getSNP(dataob:object, variant:object){
    console.log(dataob);
    let props = variant.properties? variant.properties : variant;
      
    let snpProps = props.snpProps ? JSON.parse(variant.properties.snpProps) : search.loadSNP(dataob.name);

   // dataob.snpProps = await Promise.resolve(snpProps);
   // console.log(dataob);
    return await Promise.resolve(snpProps);

}

export async function structPheno(nodeP: object){

    let nodeOb = await Promise.resolve(nodeP);

    nodeOb.properties.geneMap = typeof nodeOb.properties.geneMap == 'string'? JSON.parse(nodeOb.properties.geneMap) : nodeOb.properties.geneMap;

    nodeOb.properties.geneMap.phenotypeMapList = nodeOb.properties.geneMap.phenotypeMapList.map(p=> {
        let pheno = p.phenotypeMap
        let phenoOb = new PhenotypeObject(pheno.phenotypeMimNumber.toString());
        phenoOb.mimNumber = pheno.mimNumber;
        phenoOb.description = pheno.phenotype;// "Bart-Pumphrey syndrome"
        phenoOb.phenotypeInheritance = pheno.phenotypeInheritance;
        phenoOb.phenotypeMappingKey = pheno.phenotypeMappingKey;
        phenoOb.phenotypeMimNumber = pheno.phenotypeMimNumber;
        return phenoOb;
    });
    return nodeOb;
}

export async function drawSelectedPanel(query) {
    let panel = d3.select('#query-panel');
    panel.selectAll('*').remove();
    panel.append('h2').text(query.name);
    query.description != undefined ? panel.append('text').text(query.description) : panel.append('text').text('pathway');
}
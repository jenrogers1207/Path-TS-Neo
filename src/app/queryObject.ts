import * as d3 from 'D3';
import { promises } from 'fs';
var search = require('./search');

export class SelectedOb {

}

export class QueryObject {

    name:string;
    ncbi:string;
    keggId:string;
    properties: object;
    entrez:string;
    type:string;

    constructor(queryVal:string) {
        this.type = ''
        this.name = queryVal;
        this.properties = {
            'Ids': {},
            'Location': {},
            'Phenotypes': {},
            'Models':{},
            'Text':{},
            'References':{},
            'Symbols':{},
            'Description':{},
            'Variants':{},
            'Orthology':{},
            'Brite':{},
            'Structure': {},
            'Name': {}
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
        this.properties = {
            'Ids': {},
            'Location': {},
            'Phenotypes': {},
            'Structure': {},
            'Text': {},
            'Name': {}
        };
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
    properties:object;

    constructor(phenoId:string) {
        this.type = 'Phenotype';
        this.name = phenoId;
        this.properties = {}
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

export async function structVariants(nodeOb: object, variantObs){
 //  console.log('structuring variant', nodeOb);
    let varArray = nodeOb.properties.Variants;
    let variants = typeof varArray === 'string' ? JSON.parse(varArray) : varArray;
   // if(!nodeOb.properties){ nodeOb.properties = nodeOb.data}
 
    let obs = variants.map(async (v)=> {
        let snpName = v.properties? v.properties.dbsnp : v.dbSnps;
        let variantOb = new VariantObject(snpName);
        variantOb.name = snpName;
        variantOb.associatedGene = nodeOb.value;
        variantOb.OMIM = v.properties? v.properties.mimNumber : v.mimNumber;
        variantOb.mutations = v.properties? v.properties.mutations : v.mutations;
        variantOb.description = v.properties? v.properties.description : v.name;
        variantOb.clinvarAccessions = v.properties? v.properties.clinvarAccessions : v.clinvarAccessions;
        variantOb.text = v.properties? v.properties.text : v.text;

        //variantOb.snpProps = getSNP(variantOb, v);

        /*
        allele_annotations: (3) [{…}, {…}, {…}]
        anchor: "NC_000013.11:0020189531:1:snv"
        placements_with_allele: (7) [{…}, {…}, {…}, {…}, {…}, {…}, {…}]
        support: (5) [{…}, {…}, {…}, {…}, {…}]
        variant_type: "snv"
*/
        
        let snp = await search.loadSNP(variantOb.name);

            variantOb.properties.Type = snp.variant_type;
            variantOb.properties.Location.anchor = snp.anchor;
            variantOb.properties.Location.placements_with_allele = snp.placements_with_allele;
            variantOb.properties.allelleAnnotations = snp.allele_annotations;
            let clinicalSNP = snp.allele_annotations.filter(a=> a.clinical.length > 0);
        
            variantOb.properties.Phenotypes = clinicalSNP.map(f=> f.clinical);

        return variantOb;
    });


  return await Promise.all(obs);
}

export async function structPheno(nodeP: object){

    let nodeOb = await Promise.resolve(nodeP);
    console.log('node in pheno', nodeOb)
    /*mimNumber: 121011
    phenotype: "Bart-Pumphrey syndrome"
    phenotypeInheritance: "Autosomal dominant"
    phenotypeMappingKey: 3
    phenotypeMimNumber: 149200*/

    nodeOb.properties = typeof nodeOb.properties == 'string'? JSON.parse(nodeOb.properties) : nodeOb.properties;
    let phenoob = Promise.resolve(nodeOb.properties.Phenotypes);
    let pheno = typeof nodeOb.properties.Phenotypes == 'string'? JSON.parse(nodeOb.properties.Phenotypes) : nodeOb.properties.Phenotypes;
    console.log('phenohere',phenoOb);
    let inner = phenoOb.nodes? phenoOb.nodes:phenoOb;

    console.log('inner', inner);

    let nodes = inner.map(p=> {
        let pheno = p.phenotypeMap
        let phenoOb = new PhenotypeObject(pheno.phenotypeMimNumber.toString());
        phenoOb.properties.OMIM = pheno.mimNumber;
        phenoOb.properties.description = pheno.phenotype;// "Bart-Pumphrey syndrome"
        phenoOb.properties.phenotypeInheritance = pheno.phenotypeInheritance;
        phenoOb.properties.phenotypeMappingKey = pheno.phenotypeMappingKey;
        phenoOb.properties.phenotypeMimNumber = pheno.phenotypeMimNumber;
        return phenoOb;
    });
   // return nodeOb;
   return await Promise.resolve(nodes);
}

export async function drawSelectedPanel(query) {
    let panel = d3.select('#query-panel');
    panel.selectAll('*').remove();
    panel.append('h2').text(query.name);
    query.description != undefined ? panel.append('text').text(query.description) : panel.append('text').text('pathway');
}
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
            'Symbols':[],
            'Description':{},
            'Variants':{},
            'Orthology':{},
            'Brite':{},
            'Structure': {},
            'name': queryVal
        };
    }
}

export class VariantObject {

    type:string;
    name:string;
   // associatedGene:string;
    dbSnp:string;
    properties:object;

    constructor(snpId:string) {
        this.type = 'Variant';
        this.name = snpId;  
        this.properties = {
            'Ids': {},
            'Location': {},
            'Phenotypes': {},
            'Structure': {},
            'Text': {},
            'Name': {},
            'associatedGene': ''
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

export async function structVariants(varArray: object){
 

    let variants = typeof varArray === 'string' ? JSON.parse(varArray) : varArray;
   // if(!nodeOb.properties){ nodeOb.properties = nodeOb.data}
 
    let obs = variants.map(async (v)=> {
    
        let snpName = v.name? v.name : v.properties.Ids.dbsnp;
       // let variantOb = new VariantObject(snpName);
        let variantOb = v;
        //determine if properties exist -  has this already been loaded?
      //  variantOb.name = snpName;
      //  variantOb.associatedGene = v.associatedGene;
        variantOb.OMIM = v.properties.mimNumber? v.properties.mimNumber : v.mimNumber;
       // variantOb.mutations = v.properties.mutations? v.properties.mutations : v.mutations;
      //  variantOb.description = v.properties.description? v.properties.description : v.name;
       // variantOb.clinvarAccessions = v.properties? v.properties.clinvarAccessions : v.clinvarAccessions;
        variantOb.Text = v.properties.text? v.properties.text : v.text;

        if(variantOb.properties.allelleAnnotations == undefined){

            let snp = await search.loadSNP(variantOb.name);
           // console.log('snpppp',snp);
            variantOb.properties.Type = snp.variant_type;
            variantOb.properties.Location.anchor = snp.anchor;
            variantOb.properties.Location.placements_with_allele = snp.placements_with_allele;
            variantOb.properties.allelleAnnotations = snp.allele_annotations;
            let clinicalSNP = snp.allele_annotations.filter(a=> a.clinical.length > 0);
            
            variantOb.properties.Phenotypes = clinicalSNP.map(f=> f.clinical);
        }
       
        return variantOb;
    });


  return await Promise.all(obs);
}

export async function structPheno(phenob: object, assocGene:string){

    let inner = JSON.parse(phenob).nodes? JSON.parse(phenob).nodes:phenob;
    
    let nodes = inner.map(p=> {
       
        let props = p.properties? p.properties : p;
        props = props.phenotypeMap? props.phenotypeMap : props;
       
        let phenoOb = new PhenotypeObject(props.phenotypeMimNumber.toString());
      
        phenoOb.properties.OMIM = props.mimNumber? props.mimNumber : props.OMIM;
        phenoOb.properties.description =  props.phenotype? props.phenotype : props.description;// "Bart-Pumphrey syndrome"
        phenoOb.properties.phenotypeInheritance =  props.phenotypeInheritance;
        phenoOb.properties.phenotypeMappingKey =  props.phenotypeMappingKey;
        phenoOb.properties.phenotypeMimNumber =  props.phenotypeMimNumber;
        return phenoOb;
    });
 
   return await Promise.resolve(nodes);
}

export async function drawSelectedPanel(query) {
    let panel = d3.select('#query-panel');
    panel.selectAll('*').remove();
    panel.append('h2').text(query.name);
    query.description != undefined ? panel.append('text').text(query.description) : panel.append('text').text('pathway');
}
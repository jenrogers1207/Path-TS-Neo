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
 /*
 Ids: {dbSnp: "rs886037625"}
Location: {anchor: "NC_000013.11:0020189297:5:delins", placements_with_allele: Array(7)}
Name: {}
Phenotypes: [Array(1)]
Structure: {}
Text: {}
Type: "delins"
allelleAnnotations: (2) [{…}, {…}]
associatedGene: "GJB2"
clinvarAccessions: "RCV000018552"
dbSnps: "rs886037625"
description: "rs886037625"
mimNumber: 121011
mutations: "GJB2, 5-BP DUP, NT280"
name: "DEAFNESS, AUTOSOMAL RECESSIVE 1A"
number: 25
status: "live"
text: "In a study in Italy of 179 unrelated subjects with sporadic or familial hearing loss, {46:Gualandi et al. (2002)} identified a patient with sporadic nonsyndromic hearing loss ({220290}) in whom a 5-bp duplication (CACGT) of nucleotides 280 to 284 resulted in a frameshift at codon 96."

*/

    let variants = typeof varArray === 'string' ? JSON.parse(varArray) : varArray;
   // if(!nodeOb.properties){ nodeOb.properties = nodeOb.data}
  //  console.log('struct variants',variants);
  //console.log('variants',variants)
    let obs = variants.map(async (v)=> {
      
        let props = v.properties.properties? JSON.parse(v.properties.properties): v.properties;
       // console.log('props', props);
        let snpName = v.name? v.name : props.Ids.dbsnp;
        let variantOb = new VariantObject(snpName);
       // let variantOb = v;
        //determine if properties exist -  has this already been loaded?
      //  variantOb.name = snpName;
        variantOb.properties.associatedGene = props.associatedGene;
        variantOb.properties.OMIM = props.mimNumber? props.mimNumber : v.mimNumber;
        variantOb.properties.mutations = props.mutations? props.mutations : v.mutations;
        variantOb.properties.description = props.description? props.description : v.name;
        variantOb.properties.clinvarAccessions = props.clinvarAccessions? props.clinvarAccessions : 'null';
        variantOb.properties.Text = props.Text.length == 0? props.text : props.text;
        //let props = variantOb.properties.properties? variantOb.properties.properties : variantOb.properties;
       // let propOb = typeof props == "string"? JSON.parse(props):props;
        //console.log('var Obs', propOb);

        if(props.allelleAnnotations == undefined){
           // console.log('snp is loading');
            let snp = await search.loadSNP(variantOb.name);
           // console.log('snpppp',snp);
            variantOb.properties.Type = snp.variant_type;
            variantOb.properties.Location.anchor = snp.anchor? snp.anchor : 'null';
            variantOb.properties.Location.placements_with_allele = snp.placements_with_allele;
            variantOb.properties.allelleAnnotations = snp.allele_annotations;
            let clinicalSNP = snp.allele_annotations.filter(a=> a.clinical.length > 0);
            
            variantOb.properties.Phenotypes = clinicalSNP.map(f=> f.clinical);
        }else{
            variantOb.properties.Type = props.Type;
            variantOb.properties.Location = props.Location;
            variantOb.properties.allelleAnnotations = props.allelleAnnotations;
            variantOb.properties.Phenotypes = props.Phenotypes;

        }
        //console.log(variantOb);
        return variantOb;
    });

 // console.log('obs',obs);
  return await Promise.all(obs);
}

export async function structPheno(phenob: object, assocGene:string){
    console.log('is thisworking?')
    let inner = JSON.parse(phenob).nodes? JSON.parse(phenob).nodes:phenob;
    
    let nodes = inner.map(p=> {
       
        let props = p.properties? p.properties : p;
        props = props.phenotypeMap? props.phenotypeMap : props;
       
        let phenoOb = new PhenotypeObject(props.phenotypeMimNumber.toString());
        phenoOb.properties.associatedGene = assocGene;
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
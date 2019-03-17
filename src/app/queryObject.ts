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

/*Brite: "{"kegg":[["KEGG","Orthology","(KO)","[BR:hsa00001]"],["09180","Brite","Hierarchies"],["09183","Protein","families:","signaling","and","cellular","processes"],["02000","Transporters","[BR:hsa02000]"],["2706","(GJB2)"],["Transporters","[BR:hsa02000]"],["Other","Transporters"],["Pores","ion","channels","[TC:1]"],["2706","(GJB2)"]]}"
Description: "gap junction protein beta 2"
Location: "{"chromosome":13,"chromosomeStart":20187462,"chromosomeEnd":20192974,"chromosomeSort":15,"computedCytoLocation":"13q12.11","cytoLocation":"13q11-q12"}"
Models: "{"mouse":{"MgiID":"MGI:95720","symbol":"Gjb2"}}"
NCBI-GeneID: "2706"
NCBI-ProteinID: "NP_003995"
Orthology: "{"keggID":"K07621"}"
Phenotypes: "{"nodes":[{"phenotypeMap":{"mimNumber":121011,"phenotype":"Bart-Pumphrey syndrome","phenotypeMimNumber":149200,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Deafness, autosomal dominant 3A","phenotypeMimNumber":601544,"phenotypicSeriesNumber":"PS124900","phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Deafness, autosomal recessive 1A","phenotypeMimNumber":220290,"phenotypicSeriesNumber":"PS220290","phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal recessive"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Hystrix-like ichthyosis with deafness","phenotypeMimNumber":602540,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Keratitis-ichthyosis-deafness syndrome","phenotypeMimNumber":148210,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Keratoderma, palmoplantar, with deafness","phenotypeMimNumber":148350,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Vohwinkel syndrome","phenotypeMimNumber":124500,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}}],"keggIDs":[{"keggId":"H00604","stringId":["Deafness,","autosomal","dominant"]},{"keggId":"H00605","stringId":["Deafness,","autosomal","recessive"]},{"keggId":"H00706","stringId":["Bart-Pumphrey","syndrome"]},{"keggId":"H00712","stringId":["KID/HID","syndrome"]},{"keggId":"H00714","stringId":["Vohwinkel","syndrome"]},{"keggId":"H00716","stringId":["Palmoplantar","keratoderma","with","deafness"]}]}"
References: "[{"mimNumber":121011,"referenceNumber":1,"authors""
Structure: "{"AASEQ":[["226"],["MDWGTLQTILGGVNKHSTSIGKIWLTVLFIFRIMILVVAAKEVWGDEQADFVCNTLQPGC"],["KNVCYDHYFPISHIRLWALQLIFVSTPALLVAMHVAYRRHEKKRKFIKGEIKSEFKDIEE"],["IKTQKVRIEGSLWWTYTSSIFFRVIFEAAFMYVFYVMYDGFSMQRLVKCNAWPCPNTVDC"],["FVSRPTEKTVFTVFMIAVSGICILLNVTELCYLLIRYCSGKSKKPV"]],"NTSEQ":[["681"],["atggattggggcacgctgcagacgatcctggggggtgtgaacaaacactccaccagcatt"],["ggaaagatctggctcaccgtcctcttcatttttcgcattatgatcctcgttgtggctgca"],["aaggaggtgtggggagatgagcaggccgactttgtctgcaacaccctgcagccaggctgc"],["aagaacgtgtgctacgatcactacttccccatctcccacatccggctatgggccctgcag"],["ctgatcttcgtgtccacgccagcgctcctagtggccatgcacgtggcctaccggagacat"],["gagaagaagaggaagttcatcaagggggagataaagagtgaatttaaggacatcgaggag"],["atcaaaacccagaaggtccgcatcgaaggctccctgtggtggacctacacaagcagcatc"],["ttcttccgggtcatcttcgaagccgccttcatgtacgtcttctatgtcatgtacgacggc"],["ttctccatgcagcggctggtgaagtgcaacgcctggccttgtcccaacactgtggactgc"],["tttgtgtcccggcccacggagaagactgtcttcacagtgttcatgattgcagtgtctgga"],["atttgcatcctgctgaatgtcactgaattgtgttatttgctaattagatattgttctggg"],["aagtcaaaaaagccagtttaa"]],"ids":[["PDB:","5ER7","2ZW3","5ERA","3IZ1","3IZ2","5KJG","5KJ3"]],"MOTIF":[["Pfam:","Connexin"]]}"
Symbols: "GJB2, CX26, DFNB1A, PPK, DFNA3A, KID, HID"
Text: "[{"textSectionName":"description","textSectionTitl"
Titles: "{"preferredTitle":"GAP JUNCTION PROTEIN, BETA-2; GJB2","alternativeTitles":"GAP JUNCTION PROTEIN, 26-KD;;\nCONNEXIN 26; CX26"}"
Transcript: "ENST00000645189.1"
UniProt: "P29033"
Variants: (120) [VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, VariantObject, …]
Vega: "OTTHUMG00000016513"
description: "gap junction protein beta 2"

mappingMethod: "REa, A, Fd"
name: "GJB2"
symbol: "GJB2"
transcript: "ENST00000645189.1"*/

export async function structGene(g: object){
console.log('geneOb',geneOb);
let geneOb = g.properties;
let node = new QueryObject(g.name);
node.properties.Ids.ncbi = geneOb.ncbi;
node.properties.Ids.sequenceID =  geneOb.sequenceID;
node.properties.Ids.taxid = geneOb.taxid;
node.properties.Ids.Vega = geneOb.Vega;
node.properties.Ids.OMIM = geneOb.OMIM;
node.properties.Ids.Pharos = geneOb.Pharos;
node.properties.Ids.HGNC = geneOb.HGNC;
node.properties.Ids.Ensemble = geneOb.Ensemble;
node.properties.Ids.UniProt = geneOb.UniProt;
node.properties.Description = geneOb.description;
node.properties.Brite = geneOb.Brite;//: "{"kegg":[["KEGG","Orthology","(KO)","[BR:hsa00001]"],["09180","Brite","Hierarchies"],["09183","Protein","families:","signaling","and","cellular","processes"],["02000","Transporters","[BR:hsa02000]"],["2706","(GJB2)"],["Transporters","[BR:hsa02000]"],["Other","Transporters"],["Pores","ion","channels","[TC:1]"],["2706","(GJB2)"]]}"
 //: "gap junction protein beta 2"
node.properties.Location = geneOb.Location;//: "{"chromosome":13,"chromosomeStart":20187462,"chromosomeEnd":20192974,"chromosomeSort":15,"computedCytoLocation":"13q12.11","cytoLocation":"13q11-q12"}"
node.properties.Models = geneOb.Models; //"{"mouse":{"MgiID":"MGI:95720","symbol":"Gjb2"}}"
node.properties.NCBI-GeneID = geneOb.NCBI-GeneID; //"2706"
node.properties.NCBI-ProteinID = geneOb.NCBI-ProteinID;//"NP_003995"

/*
node.properties.Orthology = //"{"keggID":"K07621"}"
node.properties.Phenotypes: //"{"nodes":[{"phenotypeMap":{"mimNumber":121011,"phenotype":"Bart-Pumphrey syndrome","phenotypeMimNumber":149200,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Deafness, autosomal dominant 3A","phenotypeMimNumber":601544,"phenotypicSeriesNumber":"PS124900","phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Deafness, autosomal recessive 1A","phenotypeMimNumber":220290,"phenotypicSeriesNumber":"PS220290","phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal recessive"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Hystrix-like ichthyosis with deafness","phenotypeMimNumber":602540,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Keratitis-ichthyosis-deafness syndrome","phenotypeMimNumber":148210,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Keratoderma, palmoplantar, with deafness","phenotypeMimNumber":148350,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Vohwinkel syndrome","phenotypeMimNumber":124500,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}}],"keggIDs":[{"keggId":"H00604","stringId":["Deafness,","autosomal","dominant"]},{"keggId":"H00605","stringId":["Deafness,","autosomal","recessive"]},{"keggId":"H00706","stringId":["Bart-Pumphrey","syndrome"]},{"keggId":"H00712","stringId":["KID/HID","syndrome"]},{"keggId":"H00714","stringId":["Vohwinkel","syndrome"]},{"keggId":"H00716","stringId":["Palmoplantar","keratoderma","with","deafness"]}]}"
node.properties.References: //"[{"mimNumber":121011,"referenceNumber":1,"authors""
node.properties.Structure: //"{"AASEQ":[["226"],["MDWGTLQTILGGVNKHSTSIGKIWLTVLFIFRIMILVVAAKEVWGDEQADFVCNTLQPGC"],["KNVCYDHYFPISHIRLWALQLIFVSTPALLVAMHVAYRRHEKKRKFIKGEIKSEFKDIEE"],["IKTQKVRIEGSLWWTYTSSIFFRVIFEAAFMYVFYVMYDGFSMQRLVKCNAWPCPNTVDC"],["FVSRPTEKTVFTVFMIAVSGICILLNVTELCYLLIRYCSGKSKKPV"]],"NTSEQ":[["681"],["atggattggggcacgctgcagacgatcctggggggtgtgaacaaacactccaccagcatt"],["ggaaagatctggctcaccgtcctcttcatttttcgcattatgatcctcgttgtggctgca"],["aaggaggtgtggggagatgagcaggccgactttgtctgcaacaccctgcagccaggctgc"],["aagaacgtgtgctacgatcactacttccccatctcccacatccggctatgggccctgcag"],["ctgatcttcgtgtccacgccagcgctcctagtggccatgcacgtggcctaccggagacat"],["gagaagaagaggaagttcatcaagggggagataaagagtgaatttaaggacatcgaggag"],["atcaaaacccagaaggtccgcatcgaaggctccctgtggtggacctacacaagcagcatc"],["ttcttccgggtcatcttcgaagccgccttcatgtacgtcttctatgtcatgtacgacggc"],["ttctccatgcagcggctggtgaagtgcaacgcctggccttgtcccaacactgtggactgc"],["tttgtgtcccggcccacggagaagactgtcttcacagtgttcatgattgcagtgtctgga"],["atttgcatcctgctgaatgtcactgaattgtgttatttgctaattagatattgttctggg"],["aagtcaaaaaagccagtttaa"]],"ids":[["PDB:","5ER7","2ZW3","5ERA","3IZ1","3IZ2","5KJG","5KJ3"]],"MOTIF":[["Pfam:","Connexin"]]}"
node.properties.Symbols: //"GJB2, CX26, DFNB1A, PPK, DFNA3A, KID, HID"
node.properties.Text:// "[{"textSectionName":"description","textSectionTitl"
node.properties.Titles: //"{"preferredTitle":"GAP JUNCTION PROTEIN, BETA-2; GJB2","alternativeTitles":"GAP JUNCTION PROTEIN, 26-KD;;\nCONNEXIN 26; CX26"}"
node.properties.Transcript: //"ENST00000645189.1"
node.properties.Variants: //(120) [VariantObject,
*/


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
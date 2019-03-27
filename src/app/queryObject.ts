import * as d3 from 'D3';
import { promises } from 'fs';
var search = require('./search');


export class GeneObject {

    name:string;
    ncbi:string;
    keggId:string;
    properties: object;
    entrez:string;
    type:string;

    constructor(queryVal:string, typeVal:string) {
        this.type = typeVal;
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

export class QueryStore{
    queryKeeper: Array<object>;

    constructor() {
        this.queryKeeper = [];
    }

    addQueryOb(queryOb: GeneObject){
        this.queryKeeper.push(queryOb);
        
        return this.queryKeeper;
    }

    removeQueryOb(queryName: string){
        this.queryKeeper = this.queryKeeper.filter(q=> q.name != queryName);    
    }

    selectQueryOb(queryIndex: int){
     
        let array = this.queryKeeper.slice(0);
        console.log(array);
        console.log(this.queryKeeper[0])
        let node = this.queryKeeper[queryIndex]
        return node;
    }

}

export let selected = new QueryStore();

export let allQueries = new QueryStore();


export async function structGene(g: object){
    
    let ob = await Promise.resolve(g);//.properties;

    let geneOb = ob.properties;
    let node = new GeneObject(ob.name, 'Gene');
    node.label = ob.label? ob.label : ob.type;

    node.type = ob.type? ob.type: ob.label[0];
    /*
    node.properties.Ids.ncbi = geneOb.ncbi;
    node.properties.Ids.sequenceID =  geneOb.sequenceID;
    node.properties.Ids.taxid = geneOb.taxid;
    node.properties.Ids.Vega = geneOb.Vega;
    node.properties.Ids.OMIM = geneOb.OMIM;
    node.properties.Ids.Pharos = geneOb.Pharos;
    node.properties.Ids.HGNC = geneOb.HGNC;
    node.properties.Ids.Ensemble = geneOb.Ensemble;
    node.properties.Ids.UniProt = geneOb.UniProt;
    node.properties.Ids['NCBI-GeneID'] = geneOb['NCBI-GeneID']; //"2706"
    node.properties.Ids['NCBI-ProteinID'] = geneOb['NCBI-ProteinID'];
    */
    node.properties.Ids = typeof geneOb.Ids === 'string' ? JSON.parse(geneOb.Ids): geneOb.Ids;
    node.properties.Description = geneOb.Description;
    node.properties.Brite = typeof geneOb.Brite == 'string'? JSON.parse(geneOb.Brite) : geneOb.Brite;//: "{"kegg":[["KEGG","Orthology","(KO)","[BR:hsa00001]"],["09180","Brite","Hierarchies"],["09183","Protein","families:","signaling","and","cellular","processes"],["02000","Transporters","[BR:hsa02000]"],["2706","(GJB2)"],["Transporters","[BR:hsa02000]"],["Other","Transporters"],["Pores","ion","channels","[TC:1]"],["2706","(GJB2)"]]}"
    //: "gap junction protein beta 2"
    node.properties.Location = typeof geneOb.Location == 'string' ? JSON.parse(geneOb.Location) : geneOb.Location;//: "{"chromosome":13,"chromosomeStart":20187462,"chromosomeEnd":20192974,"chromosomeSort":15,"computedCytoLocation":"13q12.11","cytoLocation":"13q11-q12"}"
    node.properties.Models = typeof geneOb.Models == 'string' ? JSON.parse(geneOb.Models) : geneOb.Models; //"{"mouse":{"MgiID":"MGI:95720","symbol":"Gjb2"}}"
    node.properties.Orthology = typeof geneOb.Orthology == 'string'? JSON.parse(geneOb.Orthology) : geneOb.Orthology;//"{"keggID":"K07621"}"
    node.properties.Phenotypes = typeof geneOb.Phenotypes == 'string' ? JSON.parse(geneOb.Phenotypes) : geneOb.Phenotypes;//"{"nodes":[{"phenotypeMap":{"mimNumber":121011,"phenotype":"Bart-Pumphrey syndrome","phenotypeMimNumber":149200,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Deafness, autosomal dominant 3A","phenotypeMimNumber":601544,"phenotypicSeriesNumber":"PS124900","phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Deafness, autosomal recessive 1A","phenotypeMimNumber":220290,"phenotypicSeriesNumber":"PS220290","phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal recessive"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Hystrix-like ichthyosis with deafness","phenotypeMimNumber":602540,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Keratitis-ichthyosis-deafness syndrome","phenotypeMimNumber":148210,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Keratoderma, palmoplantar, with deafness","phenotypeMimNumber":148350,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}},{"phenotypeMap":{"mimNumber":121011,"phenotype":"Vohwinkel syndrome","phenotypeMimNumber":124500,"phenotypeMappingKey":3,"phenotypeInheritance":"Autosomal dominant"}}],"keggIDs":[{"keggId":"H00604","stringId":["Deafness,","autosomal","dominant"]},{"keggId":"H00605","stringId":["Deafness,","autosomal","recessive"]},{"keggId":"H00706","stringId":["Bart-Pumphrey","syndrome"]},{"keggId":"H00712","stringId":["KID/HID","syndrome"]},{"keggId":"H00714","stringId":["Vohwinkel","syndrome"]},{"keggId":"H00716","stringId":["Palmoplantar","keratoderma","with","deafness"]}]}"
    node.properties.References = typeof geneOb.References == 'string' ? JSON.parse(geneOb.References) : geneOb.References; //"[{"mimNumber":121011,"referenceNumber":1,"authors""
    node.properties.Structure = typeof geneOb.Structure == 'string'? JSON.parse(geneOb.Structure) : geneOb.Structure;//"{"AASEQ":[["226"],["MDWGTLQTILGGVNKHSTSIGKIWLTVLFIFRIMILVVAAKEVWGDEQADFVCNTLQPGC"],["KNVCYDHYFPISHIRLWALQLIFVSTPALLVAMHVAYRRHEKKRKFIKGEIKSEFKDIEE"],["IKTQKVRIEGSLWWTYTSSIFFRVIFEAAFMYVFYVMYDGFSMQRLVKCNAWPCPNTVDC"],["FVSRPTEKTVFTVFMIAVSGICILLNVTELCYLLIRYCSGKSKKPV"]],"NTSEQ":[["681"],["atggattggggcacgctgcagacgatcctggggggtgtgaacaaacactccaccagcatt"],["ggaaagatctggctcaccgtcctcttcatttttcgcattatgatcctcgttgtggctgca"],["aaggaggtgtggggagatgagcaggccgactttgtctgcaacaccctgcagccaggctgc"],["aagaacgtgtgctacgatcactacttccccatctcccacatccggctatgggccctgcag"],["ctgatcttcgtgtccacgccagcgctcctagtggccatgcacgtggcctaccggagacat"],["gagaagaagaggaagttcatcaagggggagataaagagtgaatttaaggacatcgaggag"],["atcaaaacccagaaggtccgcatcgaaggctccctgtggtggacctacacaagcagcatc"],["ttcttccgggtcatcttcgaagccgccttcatgtacgtcttctatgtcatgtacgacggc"],["ttctccatgcagcggctggtgaagtgcaacgcctggccttgtcccaacactgtggactgc"],["tttgtgtcccggcccacggagaagactgtcttcacagtgttcatgattgcagtgtctgga"],["atttgcatcctgctgaatgtcactgaattgtgttatttgctaattagatattgttctggg"],["aagtcaaaaaagccagtttaa"]],"ids":[["PDB:","5ER7","2ZW3","5ERA","3IZ1","3IZ2","5KJG","5KJ3"]],"MOTIF":[["Pfam:","Connexin"]]}"
    node.properties.Symbols =  geneOb.Symbols;//"GJB2, CX26, DFNB1A, PPK, DFNA3A, KID, HID"
    node.properties.Text = typeof geneOb.Text == 'string'? JSON.parse(geneOb.Text) : geneOb.Text;// "[{"textSectionName":"description","textSectionTitl"
    node.properties.Titles = typeof geneOb.Titles == 'string'? JSON.parse(geneOb.Titles): geneOb.Titles; //"{"preferredTitle":"GAP JUNCTION PROTEIN, BETA-2; GJB2","alternativeTitles":"GAP JUNCTION PROTEIN, 26-KD;;\nCONNEXIN 26; CX26"}"
    node.properties.Transcript = geneOb.Transcript; //"ENST00000645189.1"
    node.properties.Variants = typeof geneOb.Variants === 'string'? JSON.parse(geneOb.Variants) : geneOb.Variants; //(120) [VariantObject,
    node.properties.InteractionPartners = typeof geneOb.InteractionPartners === 'string'? JSON.parse(geneOb.InteractionPartners) : geneOb.InteractionPartners;

    return node;
}

export async function structVariants(varArray: object){

    let variants = typeof varArray === 'string' ? JSON.parse(varArray) : varArray;
   // if(!nodeOb.properties){ nodeOb.properties = nodeOb.data}
   // console.log('initial varr', variants);
    let obs = variants.filter(f=> f.name != undefined).map(async (v)=> {
      
        let props = v.properties.properties? JSON.parse(v.properties.properties): v.properties;
      
        let snpName = v.name? v.name : props.Ids.dbsnp;
        let variantOb = new VariantObject(snpName);
        variantOb.properties.associatedGene = props.associatedGene;
        variantOb.properties.OMIM = props.mimNumber? props.mimNumber : v.mimNumber;
        variantOb.properties.mutations = props.mutations? props.mutations : v.mutations;
        variantOb.properties.description = props.description? props.description : v.name;
        variantOb.properties.clinvarAccessions = props.clinvarAccessions? props.clinvarAccessions : 'null';
        variantOb.properties.Text = props.Text? props.Text : props.text;
        //let props = variantOb.properties.properties? variantOb.properties.properties : variantOb.properties;
       // let propOb = typeof props == "string"? JSON.parse(props):props;
      
        if(props.allelleAnnotations == undefined){
       
            let snp = await search.loadSNP(variantOb.name);
            let ens = await search.loadEnsemble(variantOb.name);
            //console.log('ens', ens);
            variantOb.properties.Type = snp.variant_type;
            variantOb.properties.Consequence = ens.most_severe_consequence;
            variantOb.properties.Frequency = ens.MAF;
            variantOb.properties.ens = ens;
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

        if(props.Consequence == undefined){
            let ens = await search.loadEnsemble(variantOb.name);
            console.log('ens in qo',ens)
            variantOb.properties.Consequence = ens.most_severe_consequence;
            variantOb.properties.Frequency = ens.MAF;
            variantOb.properties.ens = ens;
        }
      
        return await variantOb;
    });
    console.log('obs', obs)
 
  return await Promise.all(obs);
  //  return await obs;
}

export async function structPheno(phenob: object, assocGene:string){
    let inner = phenob.nodes? phenob.nodes : phenob;
    let parsed = typeof inner == 'string'? JSON.parse(inner) : inner;
    
    let nodes = parsed.map(p=> {
       
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
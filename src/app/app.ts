import "./styles.scss";
import * as d3 from 'D3';
import { QueryObject, VariantObject } from "./queryObject";
import { searchOMIM } from "./search";
const gCanvas = require('./graphRender');
var neoAPI = require('./neo4jLoader');
var search = require('./search');
var dataLoad = require('./fileDataLoad');
const qo = require('./queryObject');
import ky from 'ky';

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

dataLoad.loadFile().then(async (d)=> {

    let geneOb = new qo.QueryObject(d[0].key);
    geneOb.type = "Gene";

    let fileVariants = await variantObjectMaker(d[0].values);
    let graph = await neoAPI.getGraph();//.then(g => {

    if(graph != undefined && graph != null){
       
       // neoAPI.getGraphRelations('Variant', 'Gene', 'Mutation');
        let relationships = graph[0].links.map(rel=> { 
            return{'source': rel.source.name, 'target':rel.target.name} })
    
        let geneNode = await isStored(graph[0], 'GJB2', 'Gene', geneOb);
        

        //adding to the selection now;
        qo.selected.addQueryOb(geneNode);

        let graphVariants = graph[0].nodes.filter(d=> d.label == 'Variant');

        let variants = await updateVariants(fileVariants, graphVariants)
        let variantOb = await Promise.resolve(variants);

        variantOb.forEach(v=>{
                if(relationships.includes({'source': v.name, 'target': geneOb.name})){
                    console.log("already there");
                }else{
                 //   neoAPI.addRelation(v.name, v.type, geneOb.name, geneOb.type, 'Mutation');
                }
        });
    
        let graphPhenotypes = graph[0].nodes.filter(d=> d.label == 'Phenotype');
        let phenotypes = graphPhenotypes.length > 0? graphPhenotypes : await qo.structPheno(geneNode.properties.Phenotypes, geneNode.name);
        
        let uniqueNameArray = []
        let uniquePheno = []
        phenotypes.forEach(pheno => {
            if(uniqueNameArray.indexOf(pheno.name) == -1){
                uniqueNameArray.push(pheno.name);
                uniquePheno.push(pheno);
            }
        });
 
        geneNode.properties.Variants = variantOb;
        geneNode.properties.Phenotypes = uniquePheno;

       // let uniprot = search.searchUniprot(geneNode.properties.Ids.UniProt);

       // neoAPI.structureRelation(uniquePheno, variantOb, "Pheno");

        let interactP = await search.searchStringInteractors(geneNode.name);
        let enrighmentP = await search.searchStringEnrichment(geneNode.name);
       
        geneNode.properties.Brite = geneNode.properties.Brite.kegg.map(b=>{
            if(b[0].match(/\d/)){
                let tag = b.slice(1, (b.length))
                return {'id': b[0], 'tag': tag.reduce((a, c)=> a.concat(' '+c)) }
            }else{
                let tag = b.slice(0, (b.length - 1))
                return {'id': b[b.length - 1], 'tag': tag.reduce((a, c)=> a.concat(' '+c)) }
            }
        })
        console.log(geneNode.properties.Brite);
   
        geneNode.properties.Brite
        
        geneNode.properties.Ids.stringID = interactP[0].stringId_A;
        geneNode.properties.InteractionPartners = interactP;

        let interactionNodes = interactP.map(m => {
            let ob = {'name' : m.preferredName_B, 'type': 'Interaction', 'properties': { 'Ids': {}, 'Metrics': {} } };
            ob.properties.Ids.stringID = m.stringId_B;
            ob.properties.Source = m.preferredName_A;
            ob.properties.Metrics = d3.entries(m).filter(f=> f.key.includes('score'))
            return ob;
        });

       neoAPI.addNodeArray(interactionNodes);

        interactionNodes.forEach(rel => {
         //   neoAPI.addRelation(rel.name, 'Interaction', rel.properties.Source, 'Gene', 'Interacts');
        });

        gCanvas.drawGraph(graph, geneNode);
        gCanvas.renderCalls(geneNode);
        gCanvas.renderGeneDetail(geneNode);
  
        }else{
       
            initialSearch(geneOb).then(async n=> {
              
                let varAlleles = await variantObjectMaker(n.properties.Variants);
                let variants = await updateVariants(fileVariants, varAlleles);
                n.properties.Variants = variants;

                let structuredPheno = await qo.structPheno(n.properties.Phenotypes, n.name);
                n.properties.Phenotypes.nodes = structuredPheno;

                let interactP = await search.searchStringInteractors(n.name);
                n.properties.Ids.stringID = interactP[0].stringId_A;
               
                let interactionNodes = interactP.map(m => {
                    let ob = {'name' : m.preferredName_B, 'type': 'Interaction', 'properties': { 'Ids': {}, 'Metrics': {} } };
                    ob.properties.Ids.stringID = m.stringId_B;
                    ob.properties.Source = m.preferredName_A;
                    ob.properties.Metrics = d3.entries(m).filter(f=> f.key.includes('score'))
                    return ob;
                });

                n.properties.InteractionPartners = interactionNodes;

                console.log('n- reworked', n)

                neoAPI.addNode(n, n.type);

                neoAPI.addNodeArray(variants).then(async ()=> {
                    variants.forEach(v=>{
                        neoAPI.addRelation(v.name, v.type, n.name, n.type, 'Mutation');
                });
               
                neoAPI.addNodeArray(structuredPheno).then(async ()=> {
                    let varNames = variants.map(v=> {
                        let des = typeof v.properties == 'string'? JSON.parse(v.properties) : v.properties;
                        return des.description.toString()
                    });
                 
                    let relatedPhenotypes = n.properties.Phenotypes.nodes.map(p=>{
                            let descript = p.properties == 'string'? JSON.parse(p.properties).description : p.properties.description;
                            let pindex = varNames.indexOf(descript.toString().toUpperCase())
                            if(pindex > -1 ){
                                p.varIds = n.properties.Variants[pindex].name;
                            }else{
                                p.varIds = null;
                            }
                            return p;
                        }).filter(p=> p.varIds != null);
                        relatedPhenotypes.forEach(rel => {
                            neoAPI.addRelation(rel.name, 'Phenotype', rel.varIds, 'Variant', 'Pheno');
                    });
                });

                neoAPI.addNodeArray(interactionNodes).then(async()=> {
                    interactionNodes.forEach(rel => {
                        neoAPI.addRelation(rel.name, 'Interaction', rel.properties.Source, 'Gene', 'Interacts');
                    });
                });
            });   
        });

    }
});

async function variantObjectMaker(varArray: Array<object>){
  
    let varObs = typeof varArray == 'string'? JSON.parse(varArray): varArray;
    
      return varObs.map(v=> {
       
          let name = v.id? v.id : v.dbSnps;
          let variant = new qo.VariantObject(name);
          variant.type = "Variant";
          
          let keys = v.properties? Object.keys(v.properties) : Object.keys(v);

          keys.map(key=> {
              variant.properties[key.toString()] = v[key];
          });
          variant.properties.associatedGene = v.gene? v.gene : null;
          variant.properties.description = variant.name;
          variant.properties.Ids.dbSnp = name;
          return variant
      });
  }

async function initialSearch(queryOb: object){
   
    let idSearch = await search.searchBySymbol(queryOb);
    let mimId = await search.geneIdtoMim(idSearch);
    let omimOb = await searchOMIM(mimId);
    let kegg = await search.getKegg(omimOb.properties.Ids.ncbi, omimOb);
   
    return kegg;
}

async function isStored(graph: object, nameSearch:string, nodeType:string, data:object){
    let foundGraphNodes = graph.nodes.filter(n=> n.properties.symbol == nameSearch);
    let nodeOb = foundGraphNodes.length > 0 ? foundGraphNodes[0] : initialSearch(data);
    
    return await qo.structGene(nodeOb);
}

async function updateVariants(fileVarArr:Array<Object>, graphVarArr: Array<any>){
   
    let graphVars = typeof graphVarArr == 'string'? JSON.parse(graphVarArr) : graphVarArr;
    let variantNames = graphVars.map(v=> v.name);
    let newVars = fileVarArr.filter(v=> variantNames.indexOf(v.name) == -1);

    return addIn(newVars, await findCopies(graphVars));

    async function findCopies(nodeArray){
        let uniqueNameArray = []
        let uniqueVar = []

        await nodeArray.forEach(v => {
            if(uniqueNameArray.indexOf(v.name) == -1){
                uniqueNameArray.push(v.name);
                uniqueVar.push(v);
            }
        });
        return uniqueVar;
    }
        
    async function addIn(newArray:Array<Object>, oldArray:Array<Object>){
        if(newArray.length > 0){ newArray.forEach(v=> oldArray.push(v)) }
  
        return qo.structVariants(oldArray);
    }

}
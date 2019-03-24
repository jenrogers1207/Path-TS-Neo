import "./styles.scss";
import * as d3 from 'D3';

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

    let geneOb = new qo.GeneObject(d[0].key, 'Gene');
    geneOb.type = "Gene";

    let fileVariants = await variantObjectMaker(d[0].values);
    let graph = await neoAPI.getGraph();//.then(g => {
   
    if(graph != undefined && graph != null){
       
     
        let geneNode = await isStored(graph[0], geneOb);
 

        let queryGenes = graph[0].nodes.filter(f=> f.label == 'Gene');
        queryGenes.forEach(async (gene:object) => {
            await isStored(graph[0], gene)
           // qo.allQueries.addQueryOb(await isStored(graph[0], gene))
        });

        console.log('querykeeperr',qo.allQueries.queryKeeper)

        let graphVariants = graph[0].nodes.filter(d=> d.label == 'Variant');

        //adding selectednode as the file gene
        qo.selected.addQueryOb(geneNode);

        let variants = await updateVariants(fileVariants, graphVariants)
        let variantOb = await Promise.resolve(variants);

        geneNode.properties.Variants = variantOb;
    
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
 
        geneNode.properties.Phenotypes = uniquePheno;

        let enrighmentP = await search.searchStringEnrichment(geneNode.name);

        let graphInteraction = graph[0].nodes.filter(d=> d.label == 'Interaction');
      
        geneNode.properties.InteractionPartners = graphInteraction.map(int=> {
          
            int.properties = int.properties.properties? JSON.parse(int.properties.properties) : int.properties;
            return int;
        });

      //  neoAPI.buildSubGraph(geneNode);

        gCanvas.drawGraph(graph, geneNode);
        gCanvas.renderCalls(geneNode);
        gCanvas.renderGeneDetail(geneNode, graph[0]);
  
        }else{
       
            search.initialSearch(geneOb).then(async n=> {
               
                let varAlleles = await variantObjectMaker(n.properties.Variants);
                let variants = await updateVariants(fileVariants, varAlleles);
                n.properties.Variants = variants;

                let structuredPheno = await qo.structPheno(n.properties.Phenotypes, n.name);
                n.properties.Phenotypes.nodes = structuredPheno;

                let enrighmentP = await search.searchStringEnrichment(n.name);

                neoAPI.buildSubGraph(n);

                let newGraph = await neoAPI.getGraph();
                gCanvas.drawGraph(newGraph, n);
                gCanvas.renderCalls(n);
                gCanvas.renderGeneDetail(n, newGraph[1]);
            
        });

    }
});

export async function variantObjectMaker(varArray: Array<object>){
  
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

export async function isStored(graph: object, data:object){

    let names = qo.allQueries.queryKeeper.map(k=> {return  k.name });
    
    let foundGraphNodes = graph.nodes.filter(n=> n.name == data.name);
    let nodeOb = foundGraphNodes.length > 0 ? labelsMatch(foundGraphNodes[0], data) : await search.initialSearch(data);
    console.log('node ob', nodeOb);
    let structuredOb = await qo.structGene(await Promise.resolve(nodeOb));

    names.includes(data.name)? console.log('already there'): qo.allQueries.addQueryOb(structuredOb);

    return await structuredOb;

    async function labelsMatch(graphNode:object, newNode:object){
        let type = newNode.type? newNode.type : newNode.label;
        let node = graphNode.label == type? graphNode : neoAPI.addLabel(newNode);
        return await node;
    }
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
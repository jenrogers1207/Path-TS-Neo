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



d3.select('.search-icon').on('click', () => {
    const value = (document.getElementById('search-bar')).value;
    let dataOb = new qo.QueryObject(value);
    neoAPI.checkForNode(value).then(found => {
        if (found.length > 0) {
            console.log("already exists");
        } else {
            neoAPI.addToGraph(value, 'Gene');
        }
        search.searchBySymbol(dataOb).then(() => neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));

    });
});

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

dataLoad.loadFile().then(d=> {
  //  dataLoad.renderSidebar(d);
    let dataOb = new qo.QueryObject(d[0].key);
    dataOb.type = "Gene";
    let varArray = d[0].values.map(v=> {
        let variant = new qo.QueryObject(v.id);
        variant.type = "Variant";
        Object.keys(v).map(key=> {
            variant.properties[key.toString()] = v[key];
            variant.Gene = d[0].key;
            variant.description = variant.name;
            variant.name = variant.dbSnps;
        });
        return variant
    });

    neoAPI.getGraph().then(g => {
        console.log('graph', g);
        if(g != undefined){

            let nodeOb = isStored(g[0], 'GJB2', 'Gene', dataOb).then(nodeO=> {
                console.log("nooode",nodeO)
                let variants = g[0].nodes.filter(d=> d.label == 'Variant');
                gCanvas.drawGraph(g);
    
                nodeO.properties.allelicVariantList = variants;
            
                qo.structVariants(nodeO).then(node=> {
                    qo.structPheno(node).then(n=> {
                        gCanvas.renderSidebar(n);
                        gCanvas.renderGeneDetail(n);
                    });
                });
            });

        }else{
            console.log('g is not there');
            initialSearch(dataOb).then(n=> {
                console.log(n);
                neoAPI.addNode(n, n.type);
               // neoAPI.getGraph().then(graph=> {
               //     let variants = graph[0].nodes.filter(d=> d.label == 'Variant');
              //  gCanvas.drawGraph(graph);
    
             //   n.properties.allelicVariantList = variants;
            
                qo.structVariants(n).then(node=> {
                 
                    neoAPI.addNodeArray(node.properties.allelicVariantList).then(()=> {
                        node.properties.allelicVariantList.forEach(v=>{
                            console.log('is this hitting?')
                            console.log(node)
                            neoAPI.addRelation(v.name, 'Variant', node.value, 'Gene', 'Mutation');
                        });
                    });
                
                    qo.structPheno(node).then(no=> {
                        neoAPI.addNodeArray(no.properties.allelicVariantList).then(()=> {
                            let varNames = no.properties.allelicVariantList.map(v=> v.description.toString())
                            let relatedPhenotypes = no.properties.geneMap.phenotypeMapList.map(p=>{
                                let pindex = varNames.indexOf(p.description.toString().toUpperCase())
                                if(pindex > -1 ){
                                    p.varIds = no.properties.allelicVariantList[pindex].name;
                                }else{
                                    p.varIds = null;
                                }
                                return p;
                            }).filter(p=> p.varIds != null);
                            relatedPhenotypes.forEach(rel => {
                                neoAPI.addRelation(rel.name, 'Phenotype', rel.varIds, 'Variant', 'Pheno');
                            });
                        });

                       // neoAPI.getGraph().then(graph=> gCanvas.drawGraph(graph));
                      //  gCanvas.renderSidebar(no);
                      //  gCanvas.renderGeneDetail(no);
                    });
                });
            });
       // })
           // });

    }
})

async function initialSearch(queryOb: object){
    
    let idSearch = await search.searchBySymbol(queryOb);
    console.log('id search', idSearch);
    let mimId = await search.geneIdtoMim(idSearch);
    console.log('id mim', mimId);
    let omim = await searchOMIM(mimId);
    console.log('omim', omim);
    let kegg = await search.getKegg(omim.properties.ids.ncbi, omim);
    console.log("fin", kegg);
    return kegg;
}

async function isStored(graph: object, nameSearch:string, nodeType:string, data:object){
    let foundGraphNodes = graph.nodes.filter(n=> n.properties.symbol == nameSearch);
    let nodeOb = foundGraphNodes.length > 0 ? foundGraphNodes[0] : initialSearch(data);
    console.log('nodeOb', nodeOb)
    neoAPI.addNode(nodeOb, nodeType);
    return nodeOb
}

});
import "./styles.scss";
import * as d3 from 'D3';
import * as search from './search';
import { SelectedTest, SelectedOb, drawSelectedPanel } from './queryObject';

export function removeThings(){
    d3.select('#linked-pathways').selectAll('*').remove();
    d3.select('#pathway-render').selectAll('*').remove();
    d3.select('#assoc-genes').selectAll('*').remove();
    d3.select('#gene-id').selectAll('*').remove();
}

export async function renderCalls(data: Object){

    let sidebar = d3.select('#left-nav');
    let callTable = sidebar.select('.call-table');
    let geneDiv = callTable.selectAll('.gene').data([data]);
    geneDiv.exit().remove();

    let variantData = data.properties.Variants.map(d=>{ 
        d.tag = d.properties.Phenotypes[0][0].clinical_significances;
        return d;
    });

        let geneEnterDiv = geneDiv.enter().append('div').attr('class', d=> d.value).classed('gene', true);
        let geneHeader = geneEnterDiv.append('div').classed('gene-header', true)
        geneHeader.append('text').text(d=> d.name);
        geneDiv = geneEnterDiv.merge(geneDiv);

        let variantBox = geneDiv.append('div').classed('variant-wrapper', true);
    
        let variants = variantBox.selectAll('.variant').data(variantData);
        variants.exit().remove();
        let varEnter = variants.enter().append('div').classed('variant', true);
        let varHead = varEnter.append('div').classed('var-head', true)//.append('h5').text(d=>d.name);
        let varText = varHead.append('h5').text(d=>d.name);
        let spanType = varHead.append('span').text(d=> d.properties.Type);
        spanType.classed('badge badge-info', true);
        let spanTag = varHead.append('span').text(d=> d.tag[0]);
        spanTag.classed('badge badge-warning', true);
      //  let varSpan = varEnter.append('span').classed('w3-tag w3-padding w3-round w3-red w3-center', true).text('path')
       
        varHead.on('click', function(d){
            let text = this.nextSibling;
            d3.select(text).classed('hidden')? d3.select(text).classed('hidden', false) : d3.select(text).classed('hidden', true);
        });

        let varDes = varEnter.append('div').classed('var-descript', true).classed('hidden', true);
        let blurbs = varDes.selectAll('.blurb').data(d=>d3.entries(d)
                .filter(f=> f.key != 'allelicVariantList' && f.key != 'text' && f.key != 'name' && f.key != 'properties'))
                .enter().append('div').classed('blurb', true);

        let properties = varDes.selectAll('.props').data(d=> d3.entries(d.properties));
        let propEnter = properties.enter().append('div').classed('props', true);
        let propText = propEnter.append('text').text(d=> d.key + ": "+ d.value);

        let idBlurbs = blurbs.filter(b=> b.key != 'snpProps').append('text').text(d=> d.key + ": "+ d.value);
        let snps = blurbs.filter(b=> b.key == 'snpProps').selectAll('.snp').data(d=> d3.entries(d.value));
        let snpEnter = snps.enter().append('div').classed('snp', true);
        snpEnter.append('text').text(d=> d.key + ": ");
        snps = snpEnter.merge(snps)

        variants = varEnter.merge(variants);
  
        variants.on('mouseover', function(d){
           
        });
      
}

export async function renderGeneDetail(data: Object){
 
    let headers = d3.keys(data.properties).filter(d=> d != 'allelicVariantList' && d != 'referenceList' && d != 'name');
    console.log(data);
    
    let sidebar = d3.select('#left-nav');
    let geneDet = sidebar.select('.gene-detail');
    let geneHeader = geneDet.append('div').attr('class', 'detail-head').append('h4').text(data.title);
   // let symbolBand = geneDet.append('div').classed('symbols', true).data(JSON.parse(data.Symbols));
    let propertyDivs = geneDet.selectAll('.prop-headers').data(headers);
    let propEnter = propertyDivs.enter().append('div').classed('prop-headers', true);
    propEnter.append('div').attr('class', (d)=> d).classed('head-wrapper', true).append('h5').text((d)=> d.toUpperCase());
    let ids = propEnter.filter(d=> d == 'MIM' || d == 'entrezgene' || d == 'symbol' || d == 'description');
    let idsSec = ids.append('text').text(d=> '  ' +data.properties[d]);
    let titles = propEnter.filter(d=> d == "titles");
    let titleSec = titles.selectAll('.sections').data(d=> {
        let titleData = typeof data.properties[d] == "string" ? d3.entries(JSON.parse(data.properties[d])) : d3.entries(data.properties[d]);
        return titleData;
    });
    let titleEnter = titleSec.enter().append('div').classed('title sections', true);
    titleEnter.append('text').text(d=> d.value);

    let geneMap = propEnter.filter(d=> d == 'geneMap');
    let geneSec = geneMap.selectAll('.sections').data(d=> {
        return d3.entries(data.properties[d]).filter(d=> d.key != "phenotypeMapList");
    });
    let geneEnter = geneSec.enter().append('div').classed('geneMap sections', true);
    geneEnter.append('text').text(d=> d.key + ': ' + d.value " <br>");

    let phenoHead = geneMap.append('h5').text('Phenotype');
    let phenoSec = geneMap.selectAll('.pheno').data(d => data.properties[d].phenotypeMapList);
    let phenoEnter = phenoSec.enter().append('div').classed('pheno sections', true);

    phenoEnter.append('text').text(d=> {
        return d.description + ': ' + d.phenotypeInheritance + " <br>"});

    let textProp = propEnter.filter(d=> d == 'text');
    let textSec = textProp.selectAll('.sections').data(d=> {
        let textData = typeof data.properties[d] == 'string' ? JSON.parse(data.properties[d]) : data.properties[d];
        return textData;
    });

    let textEnter = textSec.enter().append('div').classed('text sections', true);
    let headText = textEnter.append('div').classed('text-sec-head', true).append('h5').text(d=> d.textSectionTitle + ': ');
    let textDiv = textEnter.append('div').classed('textbody', true).classed('hidden', true);
    let textText = textDiv.append('text').text(d=> d.textSectionContent);

    headText.on('click', function(d) {
        let text = this.parentNode.nextSibling
        d3.select(text).classed('hidden')? d3.select(text).classed('hidden', false) : d3.select(text).classed('hidden', true);
    })

    propertyDivs = propEnter.merge(propertyDivs);

}

export function drawGraph(dataArr: Object) {
  // console.log(dataArr)
    let data = dataArr[0];
   // console.log(data)
  // let data = dataArr;
    let canvas = d3.select('#graph-render').select('.graph-canvas'),
        width = +canvas.attr("width"),
        height = +canvas.attr("height"),
        radius = 20;

    // Define the div for the tooltip
    var toolDiv = d3.select('.tooltip');

    let simulation = d3.forceSimulation()
        .velocityDecay(0.1)
        .force("link", d3.forceLink().distance(80).strength(.5))
        .force("x", d3.forceX(width / 2).strength(.05))
        .force("y", d3.forceY(height / 2).strength(.05))
        .force("charge", d3.forceManyBody().strength(-80))
        .force('center', d3.forceCenter(400, 250));

    var link = canvas.select('.links')
        .selectAll(".line")
        .data(data.links);

    link.exit().remove();

    let linkEnter = link
        .enter().append("line")
        .classed('line', true)
        .attr("stroke-width", 2)
        .attr('stroke', '#9999');

    link = linkEnter.merge(link);

    let node = canvas.select('.nodes').selectAll('g').data(data.nodes);
    node.exit().remove();
    let nodeEnter = node
        .enter().append("g")
        .attr("class", d => {
            return "node " + d.label;
        });

    let circles = nodeEnter.append('circle')
        //.attr("r", radius - .75)
        .call(d3.drag()
            .on("start", dragstarted)
           .on("drag", dragged)
            .on("end", dragended))
         //   .on('dblclick', connectedNodes); 

    let geneNode = nodeEnter.filter(d => d.label == 'Gene');

    geneNode.classed("fixed", d=> d.fixed = true);

    function dragstart(d) {
        d3.select(this).classed("fixed", d.fixed = true);
      }

      dragstart(geneNode);

      var toggle = 0;
//Create an array logging what is connected to what
   
    let labels = geneNode.append('text').text(d => d.name).style('color', '#ffffff').attr('x', 0)
        .attr('y', 3).attr('text-anchor', 'middle');

    node.append("title")
        .text(function(d) { return d.name; });

    node = nodeEnter.merge(node);

    node.on('click', (d) => {
        SelectedOb = d.properties;
        drawGraph(data);
    });

    node.on("mouseover", function(d) {
            toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
            console.log(d)
            if(d.label == 'Phenotype'){
                toolDiv.html(d.properties.description + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

            }else{
                toolDiv.html(d.title + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
            }
            
        })
        .on("mouseout", function(d) {
            toolDiv.transition()
                .duration(500)
                .style("opacity", 0);
        });

//YOU NEED TO FIX THE SELECTED NODE

        /*
    let selectedNode = node.filter(d => {
      
        node.classed('selected', false);
        return SelectedOb != null ? d.title == SelectedOb.name : null;
    });


    selectedNode != null ? selectedNode.classed('selected', true) : console.log('no node');

    SelectedOb != null ? drawSelectedPanel(SelectedOb) : console.log('no code');
*/
    simulation
        .nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(1);
        d.fx = null;
        d.fy = null;
    }

    function ticked() {
        link.attr("x1", d => {
            return d.source.x;
        }).attr("y1", d => {
            return d.source.y;
        }).attr("x2", d => {
            return d.target.x;
        }).attr("y2", d => {
            return d.target.y;
        });

        node
            .attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });

    }

}